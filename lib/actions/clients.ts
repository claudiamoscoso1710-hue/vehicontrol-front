"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type ClientActionResult =
  | { success: true; clientId?: string }
  | { success: false; error: string };

export async function createOrgClient(
  organizationId: string,
  formData: FormData
): Promise<ClientActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const name = String(formData.get("name") ?? "").trim();
    const taxId = String(formData.get("taxId") ?? "").trim();

    if (!name) {
      return { success: false, error: "El nombre del cliente es obligatorio." };
    }

    const { data: client, error } = await supabase
      .from("clients")
      .insert({
        organization_id: organizationId,
        name,
        tax_id: taxId || null,
      })
      .select("id")
      .single();

    if (error || !client) {
      return {
        success: false,
        error: error?.message ?? "No se pudo crear el cliente.",
      };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "client_created",
      entity: "clients",
      entityId: client.id,
      newState: { name },
    });

    revalidatePath("/app/clients");
    revalidatePath("/app/trips/new");

    return { success: true, clientId: client.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el cliente." };
  }
}

export async function setTripFreightPaid(
  organizationId: string,
  tripId: string,
  paid: boolean
): Promise<ClientActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: trip, error: fetchError } = await supabase
      .from("trips")
      .select("id, client_id, status, freight_value, freight_paid")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (fetchError || !trip) {
      return { success: false, error: "Viaje no encontrado." };
    }

    if (!trip.client_id) {
      return {
        success: false,
        error: "Este viaje no está asociado a un cliente.",
      };
    }

    if (trip.status !== "closed") {
      return {
        success: false,
        error: "Solo puedes marcar pago en viajes cerrados.",
      };
    }

    if (Number(trip.freight_value ?? 0) <= 0) {
      return {
        success: false,
        error: "Este viaje no tiene flete registrado.",
      };
    }

    const { error } = await supabase
      .from("trips")
      .update({
        freight_paid: paid,
        freight_paid_at: paid ? new Date().toISOString() : null,
      })
      .eq("id", tripId)
      .eq("organization_id", organizationId);

    if (error) {
      return {
        success: false,
        error: error.message ?? "No se pudo actualizar el estado de pago.",
      };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: paid ? "trip_freight_marked_paid" : "trip_freight_marked_unpaid",
      entity: "trips",
      entityId: tripId,
      newState: {
        client_id: trip.client_id,
        freight_paid: paid,
      },
    });

    revalidatePath("/app/clients");
    revalidatePath(`/app/clients/${trip.client_id}`);
    revalidatePath(`/app/trips/${tripId}`);

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo actualizar el pago del flete." };
  }
}
