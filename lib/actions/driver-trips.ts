"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { parseMoneyValue } from "@/lib/format";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type DriverTripActionResult =
  | { success: true; tripId: string }
  | { success: false; error: string };

async function getDriverTrip(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  tripId: string,
  userId: string
): Promise<
  | { error: string }
  | { driver: { id: string }; trip: { id: string; status: string; vehicle_id: string | null; driver_id: string; organization_id: string } }
> {
  const { data: driver } = await supabase
    .from("drivers")
    .select("id")
    .eq("user_id", userId)
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .single();

  if (!driver) {
    return { error: "No tienes perfil de conductor activo." };
  }

  const { data: trip } = await supabase
    .from("trips")
    .select("id, status, vehicle_id, driver_id, organization_id")
    .eq("id", tripId)
    .eq("organization_id", organizationId)
    .single();

  if (!trip || trip.driver_id !== driver.id) {
    return { error: "Viaje no válido para este conductor." };
  }

  return { driver, trip };
}

export async function driverRegisterTrip(
  organizationId: string,
  formData: FormData
): Promise<DriverTripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const clientId = String(formData.get("clientId") ?? "");
    const origin = String(formData.get("origin") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const freightValue = parseMoneyValue(formData.get("freightValue"));

    if (!origin || !destination || !freightValue || freightValue <= 0) {
      return { success: false, error: "Completa origen, destino y flete." };
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!driver) {
      return { success: false, error: "No tienes perfil de conductor activo." };
    }

    const { data: activeTrip } = await supabase
      .from("trips")
      .select("id")
      .eq("driver_id", driver.id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (activeTrip) {
      return {
        success: false,
        error: "Ya tienes un viaje en curso. Termínalo antes de registrar otro.",
      };
    }

    const { data: assignedVehicle } = await supabase
      .from("vehicles")
      .select("id, commercial_status, operational_status")
      .eq("organization_id", organizationId)
      .eq("assigned_driver_id", driver.id)
      .eq("commercial_status", "active")
      .maybeSingle();

    if (!assignedVehicle) {
      return {
        success: false,
        error: "No tienes un vehículo asignado. Pide a tu empresa que te asigne uno.",
      };
    }

    const vehicleId = assignedVehicle.id;
    const vehicle = assignedVehicle;

    if (!["available", "assigned"].includes(vehicle.operational_status)) {
      return { success: false, error: "Tu vehículo asignado no está disponible." };
    }

    const { data: vehicleInTrip } = await supabase
      .from("trips")
      .select("id")
      .eq("vehicle_id", vehicleId)
      .eq("status", "in_progress")
      .maybeSingle();

    if (vehicleInTrip) {
      return { success: false, error: "Ese vehículo ya tiene un viaje en curso." };
    }

    const startedAt = new Date().toISOString();

    const { data: trip, error } = await supabase
      .from("trips")
      .insert({
        organization_id: organizationId,
        vehicle_id: vehicleId,
        driver_id: driver.id,
        client_id: clientId || null,
        origin,
        destination,
        freight_value: freightValue,
        status: "in_progress",
        started_at: startedAt,
      })
      .select("id")
      .single();

    if (error || !trip) {
      return { success: false, error: error?.message ?? "No se pudo registrar el viaje." };
    }

    await supabase
      .from("vehicles")
      .update({ operational_status: "in_trip" })
      .eq("id", vehicleId)
      .eq("organization_id", organizationId);

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_registered_by_driver",
      entity: "trips",
      entityId: trip.id,
      newState: {
        origin,
        destination,
        freight_value: freightValue,
        status: "in_progress",
        started_at: startedAt,
      },
    });

    revalidatePath("/driver");
    revalidatePath("/driver/history");
    revalidatePath("/app");
    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${trip.id}`);

    return { success: true, tripId: trip.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al registrar el viaje." };
  }
}

export async function driverStartTrip(
  tripId: string,
  organizationId: string
): Promise<DriverTripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const ctx = await getDriverTrip(supabase, organizationId, tripId, userId);
    if ("error" in ctx) {
      return { success: false, error: ctx.error };
    }

    const { trip } = ctx;

    if (trip.status !== "planned") {
      return { success: false, error: "Solo puedes iniciar viajes asignados pendientes." };
    }

    const { data: otherActive } = await supabase
      .from("trips")
      .select("id")
      .eq("driver_id", trip.driver_id)
      .eq("status", "in_progress")
      .maybeSingle();

    if (otherActive) {
      return {
        success: false,
        error: "Ya tienes un viaje en curso. Termínalo antes de iniciar otro.",
      };
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
      action: "trip_started_by_driver",
      entity: "trips",
      entityId: tripId,
      previousState: { status: "planned" },
      newState: { status: "in_progress" },
    });

    revalidatePath("/driver");
    revalidatePath("/driver/history");
    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${tripId}`);

    return { success: true, tripId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al iniciar el viaje." };
  }
}

export async function driverUpdateTrip(
  organizationId: string,
  tripId: string,
  formData: FormData
): Promise<DriverTripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const ctx = await getDriverTrip(supabase, organizationId, tripId, userId);
    if ("error" in ctx) {
      return { success: false, error: ctx.error };
    }

    const { trip } = ctx;

    if (trip.status !== "in_progress") {
      return {
        success: false,
        error: "Solo puedes editar viajes en curso.",
      };
    }

    const origin = String(formData.get("origin") ?? "").trim();
    const destination = String(formData.get("destination") ?? "").trim();
    const freightValue = parseMoneyValue(formData.get("freightValue"));

    if (!origin || !destination || !freightValue || freightValue <= 0) {
      return {
        success: false,
        error: "Completa origen, destino y flete válido.",
      };
    }

    const { error } = await supabase
      .from("trips")
      .update({
        origin,
        destination,
        freight_value: freightValue,
      })
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .eq("status", "in_progress");

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "trip_updated_by_driver",
      entity: "trips",
      entityId: tripId,
      newState: { origin, destination, freight_value: freightValue },
    });

    revalidatePath("/driver");
    revalidatePath("/driver/history");
    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${tripId}`);

    return { success: true, tripId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el viaje." };
  }
}

export async function driverFinishTrip(
  tripId: string,
  organizationId: string
): Promise<DriverTripActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const ctx = await getDriverTrip(supabase, organizationId, tripId, userId);
    if ("error" in ctx) {
      return { success: false, error: ctx.error };
    }

    const { trip } = ctx;

    const { data: tripFull } = await supabase
      .from("trips")
      .select("id, status, vehicle_id, freight_value")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!tripFull || tripFull.status !== "in_progress") {
      return { success: false, error: "Solo puedes terminar viajes en curso." };
    }

    const closedAt = new Date().toISOString();
    const freightValue = Number(tripFull.freight_value ?? 0);

    if (trip.vehicle_id) {
      const { data: vehicle } = await supabase
        .from("vehicles")
        .select("assigned_driver_id")
        .eq("id", trip.vehicle_id)
        .eq("organization_id", organizationId)
        .maybeSingle();

      const nextStatus = vehicle?.assigned_driver_id ? "assigned" : "available";

      const { error: vehicleError } = await supabase
        .from("vehicles")
        .update({ operational_status: nextStatus })
        .eq("id", trip.vehicle_id)
        .eq("organization_id", organizationId);

      if (vehicleError) {
        return { success: false, error: vehicleError.message };
      }
    }

    const { data: updated, error } = await supabase
      .from("trips")
      .update({
        status: "closed",
        closed_at: closedAt,
      })
      .eq("id", tripId)
      .select("id, status")
      .single();

    if (error || !updated || updated.status !== "closed") {
      return {
        success: false,
        error: error?.message ?? "No se pudo terminar el viaje.",
      };
    }

    if (freightValue > 0 && tripFull.vehicle_id) {
      const { error: incomeError } = await supabase.from("incomes").insert({
        organization_id: organizationId,
        trip_id: tripId,
        vehicle_id: tripFull.vehicle_id,
        amount: freightValue,
        concept: "Flete del viaje",
      });

      if (incomeError && !incomeError.message.includes("duplicate")) {
        return { success: false, error: incomeError.message };
      }
    }

    const { data: tripExpenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId)
      .eq("status", "approved");

    const totalExpenses =
      tripExpenses?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

    try {
      await writeAuditLog(supabase, {
        organizationId,
        userId,
        action: "trip_finished_by_driver",
        entity: "trips",
        entityId: tripId,
        previousState: { status: "in_progress", freight_value: freightValue },
        newState: {
          status: "closed",
          closed_at: closedAt,
          freight_registered: freightValue > 0,
          margin: freightValue - totalExpenses,
        },
      });
    } catch {
      // El viaje ya cerró; el audit log no debe bloquear al conductor.
    }

    revalidatePath("/driver");
    revalidatePath("/driver/history");
    revalidatePath("/app");
    revalidatePath("/app/trips");
    revalidatePath(`/app/trips/${tripId}`);
    if (tripFull.vehicle_id) {
      revalidatePath(`/app/vehicles/${tripFull.vehicle_id}`);
    }

    return { success: true, tripId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al terminar el viaje." };
  }
}
