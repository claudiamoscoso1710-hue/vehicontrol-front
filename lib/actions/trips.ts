"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { parseMoneyValue } from "@/lib/format";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";
import { registerTripFreight } from "@/lib/trips/register-trip-freight";

export type CloseTripResult =
  | {
      success: true;
      freightValue: number;
      approvedExpenses: number;
      margin: number;
    }
  | { success: false; error: string };

export type TripActionResult =
  | { success: true; tripId?: string }
  | { success: false; error: string };

export async function createTrip(
  organizationId: string,
  formData: FormData
): Promise<TripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const vehicleId = String(formData.get("vehicleId") ?? "");
    const driverId = String(formData.get("driverId") ?? "");
    const clientId = String(formData.get("clientId") ?? "");
    const origin = String(formData.get("origin") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const freightValue = parseMoneyValue(formData.get("freightValue"));

    if (!vehicleId || !driverId || !origin || !destination || !freightValue) {
      return { success: false, error: "Completa los campos obligatorios." };
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, commercial_status, operational_status")
      .eq("id", vehicleId)
      .eq("organization_id", organizationId)
      .single();

    if (!vehicle || vehicle.commercial_status !== "active") {
      return {
        success: false,
        error: "El vehículo debe estar activo comercialmente.",
      };
    }

    if (!["available", "assigned"].includes(vehicle.operational_status)) {
      return {
        success: false,
        error: "El vehículo no está disponible para un nuevo viaje.",
      };
    }

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driverId,
        client_id: clientId || null,
        origin,
        destination,
        freight_value: freightValue,
        status: "planned",
      })
      .select("id")
      .single();

    if (error || !trip) {
      return { success: false, error: error?.message ?? "No se pudo crear el viaje." };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_created",
      entity: "trips",
      entityId: trip.id,
      newState: { origin, destination, freight_value: freightValue, status: "planned" },
    });

    revalidatePath("/app");
    revalidatePath("/app/trips");

    return { success: true, tripId: trip.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el viaje." };
  }
}

export async function startTrip(
  tripId: string,
  organizationId: string
): Promise<TripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: trip } = await supabase
      .from("trips")
      .select("id, status, vehicle_id")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!trip) {
      return { success: false, error: "Viaje no encontrado." };
    }

    if (trip.status !== "planned") {
      return { success: false, error: "Solo se pueden iniciar viajes planeados." };
    }

    const { error } = await supabase
      .from("trips")
      .update({
        status: "in_progress",
        started_at: new Date().toISOString(),
      })
      .eq("id", tripId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (trip.vehicle_id) {
      await supabase
        .from("vehicles")
        .update({ operational_status: "in_trip" })
        .eq("id", trip.vehicle_id);
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_started",
      entity: "trips",
      entityId: tripId,
      previousState: { status: "planned" },
      newState: { status: "in_progress" },
    });

    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${tripId}`);
    revalidatePath("/driver");

    return { success: true, tripId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al iniciar el viaje." };
  }
}

export async function closeTrip(
  tripId: string,
  organizationId: string
): Promise<CloseTripResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: trip } = await supabase
      .from("trips")
      .select("id, status, freight_value, vehicle_id, driver_id")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!trip) {
      return { success: false, error: "Viaje no encontrado." };
    }

    if (trip.status !== "in_progress" && trip.status !== "closed") {
      return { success: false, error: "Solo se pueden finalizar viajes en curso o terminados por el conductor." };
    }

    const { data: existingIncome } = await supabase
      .from("incomes")
      .select("id")
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (existingIncome) {
      return { success: false, error: "Este viaje ya fue finalizado contablemente." };
    }

    if (trip.status === "in_progress") {
      const closedAt = new Date().toISOString();

      const { error: tripError } = await supabase
        .from("trips")
        .update({
          status: "closed",
          closed_at: closedAt,
        })
        .eq("id", tripId)
        .eq("organization_id", organizationId);

      if (tripError) {
        return { success: false, error: tripError.message };
      }

      if (trip.vehicle_id) {
        await supabase
          .from("vehicles")
          .update({ operational_status: "available" })
          .eq("id", trip.vehicle_id)
          .eq("organization_id", organizationId);
      }
    }

    const freightResult = await registerTripFreight(
      supabase,
      organizationId,
      tripId
    );

    if (!freightResult.ok) {
      return { success: false, error: freightResult.error };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_closed",
      entity: "trips",
      entityId: tripId,
      previousState: { status: trip.status, freight_value: freightResult.freightValue },
      newState: {
        status: "closed",
        approved_expenses: freightResult.totalExpenses,
        margin: freightResult.margin,
      },
    });

    revalidatePath("/app");
    revalidatePath(`/app/trips/${tripId}`);
    revalidatePath("/driver");

    return {
      success: true,
      freightValue: freightResult.freightValue,
      approvedExpenses: freightResult.totalExpenses,
      margin: freightResult.margin,
    };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cerrar el viaje." };
  }
}

export async function updateTrip(
  organizationId: string,
  tripId: string,
  formData: FormData
): Promise<TripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: trip } = await supabase
      .from("trips")
      .select("id, status, settlement_id, vehicle_id, freight_value")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!trip) {
      return { success: false, error: "Viaje no encontrado." };
    }

    if (trip.settlement_id) {
      return {
        success: false,
        error: "No puedes editar viajes de un período ya liquidado.",
      };
    }

    const origin = String(formData.get("origin") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const freightValue = parseMoneyValue(formData.get("freightValue"));
    const vehicleId = String(formData.get("vehicleId") ?? "");
    const driverId = String(formData.get("driverId") ?? "");
    const clientId = String(formData.get("clientId") ?? "");
    const status = String(formData.get("status") ?? trip.status);

    if (!origin || !destination || !freightValue || freightValue <= 0) {
      return { success: false, error: "Completa origen, destino y flete válido." };
    }
    if (!vehicleId || !driverId) {
      return { success: false, error: "Selecciona vehículo y conductor." };
    }
    if (!["planned", "in_progress", "closed"].includes(status)) {
      return { success: false, error: "Estado de viaje no válido." };
    }

    const { error } = await supabase
      .from("trips")
      .update({
        origin,
        destination,
        freight_value: freightValue,
        vehicle_id: vehicleId,
        driver_id: driverId,
        client_id: clientId || null,
        status,
      })
      .eq("id", tripId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    const { data: income } = await supabase
      .from("incomes")
      .select("id")
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId)
      .maybeSingle();

    if (income && freightValue !== Number(trip.freight_value ?? 0)) {
      await supabase
        .from("incomes")
        .update({ amount: freightValue })
        .eq("id", income.id);
    }

    await supabase
      .from("expenses")
      .update({ vehicle_id: vehicleId, driver_id: driverId })
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId);

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_updated_by_owner",
      entity: "trips",
      entityId: tripId,
      newState: {
        origin,
        destination,
        freight_value: freightValue,
        vehicle_id: vehicleId,
        driver_id: driverId,
        client_id: clientId || null,
        status,
      },
    });

    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${tripId}`);
    revalidatePath(`/app/vehicles/${vehicleId}`);
    if (trip.vehicle_id && trip.vehicle_id !== vehicleId) {
      revalidatePath(`/app/vehicles/${trip.vehicle_id}`);
    }
    revalidatePath("/driver");

    return { success: true, tripId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el viaje." };
  }
}

export async function deleteTrip(
  tripId: string,
  organizationId: string
): Promise<TripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: trip } = await supabase
      .from("trips")
      .select("id, status, settlement_id, vehicle_id")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!trip) {
      return { success: false, error: "Viaje no encontrado." };
    }

    if (trip.settlement_id) {
      return {
        success: false,
        error: "No puedes eliminar viajes de un período ya liquidado.",
      };
    }

    const { count: expenseCount } = await supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId);

    if ((expenseCount ?? 0) > 0) {
      return {
        success: false,
        error: "Elimina primero los gastos del viaje o reasígnalos.",
      };
    }

    if (trip.status === "in_progress" && trip.vehicle_id) {
      await supabase
        .from("vehicles")
        .update({ operational_status: "assigned" })
        .eq("id", trip.vehicle_id)
        .eq("organization_id", organizationId);
    }

    await supabase.from("incomes").delete().eq("trip_id", tripId);
    await supabase.from("advances").delete().eq("trip_id", tripId);

    const { error } = await supabase
      .from("trips")
      .delete()
      .eq("id", tripId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_deleted_by_owner",
      entity: "trips",
      entityId: tripId,
      previousState: trip,
    });

    revalidatePath("/app/trips");
    revalidatePath("/app");
    if (trip.vehicle_id) {
      revalidatePath(`/app/vehicles/${trip.vehicle_id}`);
    }
    revalidatePath("/driver");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el viaje." };
  }
}
