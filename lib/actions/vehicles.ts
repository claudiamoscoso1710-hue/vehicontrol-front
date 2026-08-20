"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type VehicleActionResult =
  | { success: true; vehicleId?: string }
  | { success: false; error: string };

async function requireSuperAdmin(
  supabase: Awaited<ReturnType<typeof createClient>>
) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("No autenticado.");
  }

  const { data: superMembership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .eq("status", "active")
    .maybeSingle();

  if (!superMembership) {
    throw new Error("Solo super admin puede realizar esta acción.");
  }

  return user.id;
}

async function linkVehicleToSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  vehicleId: string
) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) return;

  const { data: existing } = await supabase
    .from("subscription_vehicles")
    .select("id")
    .eq("subscription_id", subscription.id)
    .eq("vehicle_id", vehicleId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from("subscription_vehicles")
      .update({ ended_at: null, started_at: new Date().toISOString() })
      .eq("id", existing.id);
    return;
  }

  await supabase.from("subscription_vehicles").insert({
    subscription_id: subscription.id,
    vehicle_id: vehicleId,
  });
}

async function unlinkVehicleFromSubscription(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  vehicleId: string
) {
  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("status", "active")
    .maybeSingle();

  if (!subscription) return;

  await supabase
    .from("subscription_vehicles")
    .update({ ended_at: new Date().toISOString() })
    .eq("subscription_id", subscription.id)
    .eq("vehicle_id", vehicleId)
    .is("ended_at", null);
}

function revalidateVehicleAdminPaths() {
  revalidatePath("/admin/vehicles");
  revalidatePath("/admin/organizations");
  revalidatePath("/admin/subscriptions");
  revalidatePath("/app/vehicles");
}

export async function createVehicleBySuperAdmin(
  formData: FormData
): Promise<VehicleActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const organizationId = String(formData.get("organizationId") ?? "").trim();
    const plate = String(formData.get("plate") ?? "")
      .trim()
      .toUpperCase();
    const brand = String(formData.get("brand") ?? "").trim();
    const vehicleType = String(formData.get("vehicleType") ?? "").trim();

    if (!organizationId) {
      return { success: false, error: "Selecciona una organización." };
    }
    if (!plate) {
      return { success: false, error: "La placa es obligatoria." };
    }

    const { data: org } = await supabase
      .from("organizations")
      .select("id, name")
      .eq("id", organizationId)
      .maybeSingle();

    if (!org) {
      return { success: false, error: "Organización no encontrada." };
    }

    const { data: vehicle, error } = await supabase
      .from("vehicles")
      .insert({
        organization_id: organizationId,
        plate,
        brand: brand || null,
        vehicle_type: vehicleType || null,
        operational_status: "available",
        commercial_status: "active",
      })
      .select("id")
      .single();

    if (error || !vehicle) {
      return {
        success: false,
        error: error?.message ?? "No se pudo crear el vehículo.",
      };
    }

    await linkVehicleToSubscription(supabase, organizationId, vehicle.id);

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "vehicle_created_by_super_admin",
      entity: "vehicles",
      entityId: vehicle.id,
      newState: { plate, commercial_status: "active" },
    });

    revalidateVehicleAdminPaths();

    return { success: true, vehicleId: vehicle.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear vehículo.",
    };
  }
}

export async function updateVehicleBySuperAdmin(
  vehicleId: string,
  formData: FormData
): Promise<VehicleActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const plate = String(formData.get("plate") ?? "")
      .trim()
      .toUpperCase();
    const brand = String(formData.get("brand") ?? "").trim();
    const vehicleType = String(formData.get("vehicleType") ?? "").trim();

    if (!plate) {
      return { success: false, error: "La placa es obligatoria." };
    }

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, organization_id, plate")
      .eq("id", vehicleId)
      .single();

    if (!vehicle) {
      return { success: false, error: "Vehículo no encontrado." };
    }

    const { error } = await supabase
      .from("vehicles")
      .update({
        plate,
        brand: brand || null,
        vehicle_type: vehicleType || null,
      })
      .eq("id", vehicleId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId: vehicle.organization_id,
      userId,
      action: "vehicle_updated_by_super_admin",
      entity: "vehicles",
      entityId: vehicleId,
      newState: { plate, brand, vehicleType },
    });

    revalidateVehicleAdminPaths();

    return { success: true, vehicleId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al actualizar vehículo.",
    };
  }
}

export async function deactivateVehicleBySuperAdmin(
  vehicleId: string
): Promise<VehicleActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, organization_id, plate, commercial_status")
      .eq("id", vehicleId)
      .single();

    if (!vehicle) {
      return { success: false, error: "Vehículo no encontrado." };
    }

    const { error } = await supabase
      .from("vehicles")
      .update({ commercial_status: "cancelled" })
      .eq("id", vehicleId);

    if (error) {
      return { success: false, error: error.message };
    }

    await unlinkVehicleFromSubscription(
      supabase,
      vehicle.organization_id,
      vehicleId
    );

    await writeAuditLog(supabase, {
      organizationId: vehicle.organization_id,
      userId,
      action: "vehicle_deactivated_by_super_admin",
      entity: "vehicles",
      entityId: vehicleId,
      previousState: { commercial_status: vehicle.commercial_status },
      newState: { commercial_status: "cancelled" },
    });

    revalidateVehicleAdminPaths();

    return { success: true, vehicleId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al eliminar vehículo.",
    };
  }
}

export async function reviewVehicleCommercialStatus(
  vehicleId: string,
  decision: "active" | "cancelled"
): Promise<VehicleActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, organization_id, plate, commercial_status")
      .eq("id", vehicleId)
      .single();

    if (!vehicle) {
      return { success: false, error: "Vehículo no encontrado." };
    }

    if (vehicle.commercial_status !== "pending" && decision === "active") {
      return {
        success: false,
        error: "El vehículo no está pendiente de aprobación.",
      };
    }

    const { error } = await supabase
      .from("vehicles")
      .update({ commercial_status: decision })
      .eq("id", vehicleId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (decision === "active") {
      await linkVehicleToSubscription(
        supabase,
        vehicle.organization_id,
        vehicleId
      );
    } else {
      await unlinkVehicleFromSubscription(
        supabase,
        vehicle.organization_id,
        vehicleId
      );
    }

    await writeAuditLog(supabase, {
      organizationId: vehicle.organization_id,
      userId,
      action: decision === "active" ? "vehicle_approved" : "vehicle_rejected",
      entity: "vehicles",
      entityId: vehicleId,
      previousState: { commercial_status: vehicle.commercial_status },
      newState: { commercial_status: decision },
    });

    revalidatePath("/admin");
    revalidateVehicleAdminPaths();

    return { success: true, vehicleId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al revisar el vehículo.",
    };
  }
}

export async function assignVehicleDriver(
  vehicleId: string,
  organizationId: string,
  driverId: string | null
): Promise<VehicleActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: vehicle } = await supabase
      .from("vehicles")
      .select("id, operational_status, assigned_driver_id")
      .eq("id", vehicleId)
      .eq("organization_id", organizationId)
      .single();

    if (!vehicle) {
      return { success: false, error: "Vehículo no encontrado." };
    }

    if (vehicle.operational_status === "in_trip") {
      return {
        success: false,
        error: "No puedes cambiar el conductor mientras el vehículo está en viaje.",
      };
    }

    if (driverId) {
      const { data: driver } = await supabase
        .from("drivers")
        .select("id, full_name, status")
        .eq("id", driverId)
        .eq("organization_id", organizationId)
        .single();

      if (!driver || driver.status !== "active") {
        return { success: false, error: "Conductor no válido." };
      }

      await supabase
        .from("vehicles")
        .update({
          assigned_driver_id: null,
          operational_status: "available",
        })
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driverId)
        .neq("id", vehicleId);

      const { error } = await supabase
        .from("vehicles")
        .update({
          assigned_driver_id: driverId,
          operational_status:
            vehicle.operational_status === "available"
              ? "assigned"
              : vehicle.operational_status,
        })
        .eq("id", vehicleId)
        .eq("organization_id", organizationId);

      if (error) {
        return { success: false, error: error.message };
      }

      await writeAuditLog(supabase, {
        organizationId,
        userId,
        action: "vehicle_driver_assigned",
        entity: "vehicles",
        entityId: vehicleId,
        newState: { assigned_driver_id: driverId },
      });
    } else {
      const { error } = await supabase
        .from("vehicles")
        .update({
          assigned_driver_id: null,
          operational_status:
            vehicle.operational_status === "assigned"
              ? "available"
              : vehicle.operational_status,
        })
        .eq("id", vehicleId)
        .eq("organization_id", organizationId);

      if (error) {
        return { success: false, error: error.message };
      }

      await writeAuditLog(supabase, {
        organizationId,
        userId,
        action: "vehicle_driver_unassigned",
        entity: "vehicles",
        entityId: vehicleId,
        previousState: { assigned_driver_id: vehicle.assigned_driver_id },
      });
    }

    revalidatePath("/app/vehicles");
    revalidatePath(`/app/vehicles/${vehicleId}`);
    revalidatePath("/app/drivers");
    revalidatePath("/driver");
    revalidatePath("/driver/vehicle-expenses");

    return { success: true, vehicleId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al asignar el conductor." };
  }
}
