"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { assignVehicleDriver } from "@/lib/actions/vehicles";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type DriverActionResult =
  | { success: true; driverId?: string }
  | { success: false; error: string };

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}

async function ensureDriverUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  email: string,
  password: string,
  fullName: string
): Promise<string> {
  const { data, error } = await supabase.rpc("owner_ensure_driver_user", {
    p_organization_id: organizationId,
    p_email: email,
    p_password: password,
    p_full_name: fullName,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear la cuenta del conductor.");
  }

  return data as string;
}

async function persistDriverPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  driverId: string,
  password: string
) {
  const { error } = await supabase.rpc("owner_reset_driver_password", {
    p_organization_id: organizationId,
    p_driver_id: driverId,
    p_new_password: password,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function assignDriverMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  userId: string
) {
  const { data: existing } = await supabase
    .from("organization_members")
    .select("id, role, status")
    .eq("organization_id", organizationId)
    .eq("user_id", userId)
    .maybeSingle();

  if (existing?.status === "active" && existing.role !== "driver") {
    throw new Error(
      "Este usuario ya tiene otro rol en la flota. Usa un email diferente."
    );
  }

  if (existing) {
    const { error } = await supabase
      .from("organization_members")
      .update({ role: "driver", status: "active" })
      .eq("id", existing.id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await supabase.from("organization_members").insert({
      organization_id: organizationId,
      user_id: userId,
      role: "driver",
      status: "active",
    });
    if (error) throw new Error(error.message);
  }
}

export async function createDriver(
  organizationId: string,
  formData: FormData
): Promise<DriverActionResult> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "").trim();

  if (email && password) {
    return createDriverWithAccount(organizationId, formData);
  }

  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();

    if (!fullName) {
      return { success: false, error: "El nombre es obligatorio." };
    }

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        organization_id: organizationId,
        full_name: fullName,
        phone: phone || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !driver) {
      return {
        success: false,
        error: error?.message ?? "No se pudo crear el conductor.",
      };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_created",
      entity: "drivers",
      entityId: driver.id,
      newState: { full_name: fullName },
    });

    revalidatePath("/app/drivers");
    revalidatePath("/app/trips/new");

    return { success: true, driverId: driver.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el conductor." };
  }
}

export async function createDriverWithAccount(
  organizationId: string,
  formData: FormData
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const password = String(formData.get("password") ?? "").trim();
    const vehicleId = String(formData.get("vehicleId") ?? "").trim() || null;

    if (!fullName) {
      return { success: false, error: "El nombre es obligatorio." };
    }
    if (!email) {
      return { success: false, error: "El email es obligatorio." };
    }
    const passwordError = validatePassword(password);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    const driverUserId = await ensureDriverUser(
      supabase,
      organizationId,
      email,
      password,
      fullName
    );

    await assignDriverMembership(supabase, organizationId, driverUserId);

    const { data: driver, error } = await supabase
      .from("drivers")
      .insert({
        organization_id: organizationId,
        user_id: driverUserId,
        full_name: fullName,
        phone: phone || null,
        status: "active",
      })
      .select("id")
      .single();

    if (error || !driver) {
      return {
        success: false,
        error: error?.message ?? "No se pudo crear el conductor.",
      };
    }

    await persistDriverPassword(
      supabase,
      organizationId,
      driver.id,
      password
    );

    if (vehicleId) {
      const assignResult = await assignVehicleDriver(
        vehicleId,
        organizationId,
        driver.id
      );
      if (!assignResult.success) {
        return {
          success: false,
          error: `Conductor creado, pero no se pudo asignar el vehículo: ${assignResult.error}`,
        };
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_created_with_account",
      entity: "drivers",
      entityId: driver.id,
      newState: { full_name: fullName, email, vehicleId },
    });

    revalidatePath("/app/drivers");
    revalidatePath("/app/vehicles");
    revalidatePath("/app/trips/new");

    return { success: true, driverId: driver.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al crear el conductor.",
    };
  }
}

export async function updateDriverProfile(
  organizationId: string,
  driverId: string,
  formData: FormData
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const fullName = String(formData.get("fullName") ?? "").trim();
    const phone = String(formData.get("phone") ?? "").trim();

    if (!fullName) {
      return { success: false, error: "El nombre es obligatorio." };
    }

    const { error } = await supabase
      .from("drivers")
      .update({
        full_name: fullName,
        phone: phone || null,
      })
      .eq("id", driverId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_profile_updated",
      entity: "drivers",
      entityId: driverId,
      newState: { full_name: fullName, phone: phone || null },
    });

    revalidatePath("/app/drivers");
    return { success: true, driverId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el conductor." };
  }
}

export async function updateDriverEmail(
  organizationId: string,
  driverId: string,
  newEmail: string
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const email = newEmail.trim().toLowerCase();
    if (!email) {
      return { success: false, error: "El email es obligatorio." };
    }

    const { error } = await supabase.rpc("owner_update_driver_email", {
      p_organization_id: organizationId,
      p_driver_id: driverId,
      p_new_email: email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_email_updated",
      entity: "drivers",
      entityId: driverId,
      newState: { email },
    });

    revalidatePath("/app/drivers");
    return { success: true, driverId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el email." };
  }
}

export async function updateDriverPassword(
  organizationId: string,
  driverId: string,
  newPassword: string
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    const { error } = await supabase.rpc("owner_reset_driver_password", {
      p_organization_id: organizationId,
      p_driver_id: driverId,
      p_new_password: newPassword,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_password_reset",
      entity: "drivers",
      entityId: driverId,
      newState: { passwordUpdated: true },
    });

    revalidatePath("/app/drivers");
    return { success: true, driverId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cambiar la contraseña." };
  }
}

export async function assignDriverToVehicle(
  organizationId: string,
  driverId: string,
  vehicleId: string | null
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    await requireRole(supabase, organizationId, ["owner", "admin"]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, status")
      .eq("id", driverId)
      .eq("organization_id", organizationId)
      .single();

    if (!driver || driver.status !== "active") {
      return { success: false, error: "Conductor no válido." };
    }

    if (!vehicleId) {
      const { data: currentVehicle } = await supabase
        .from("vehicles")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("assigned_driver_id", driverId)
        .maybeSingle();

      if (!currentVehicle) {
        return { success: true, driverId };
      }

      return assignVehicleDriver(currentVehicle.id, organizationId, null);
    }

    return assignVehicleDriver(vehicleId, organizationId, driverId);
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al asignar el vehículo." };
  }
}

export async function removeDriver(
  organizationId: string,
  driverId: string
): Promise<DriverActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, user_id, status")
      .eq("id", driverId)
      .eq("organization_id", organizationId)
      .single();

    if (!driver) {
      return { success: false, error: "Conductor no encontrado." };
    }

    const { count: openTrips } = await supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .eq("driver_id", driverId)
      .eq("status", "in_progress");

    if ((openTrips ?? 0) > 0) {
      return {
        success: false,
        error: "No puedes eliminar un conductor con un viaje en curso.",
      };
    }

    const { data: assignedVehicle } = await supabase
      .from("vehicles")
      .select("id, operational_status")
      .eq("organization_id", organizationId)
      .eq("assigned_driver_id", driverId)
      .maybeSingle();

    if (assignedVehicle?.operational_status === "in_trip") {
      return {
        success: false,
        error: "No puedes eliminar un conductor mientras su vehículo está en viaje.",
      };
    }

    if (assignedVehicle) {
      await assignVehicleDriver(assignedVehicle.id, organizationId, null);
    }

    const { error } = await supabase
      .from("drivers")
      .update({ status: "inactive" })
      .eq("id", driverId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (driver.user_id) {
      await supabase
        .from("organization_members")
        .update({ status: "inactive" })
        .eq("organization_id", organizationId)
        .eq("user_id", driver.user_id)
        .eq("role", "driver");
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_removed",
      entity: "drivers",
      entityId: driverId,
      newState: { status: "inactive" },
    });

    revalidatePath("/app/drivers");
    revalidatePath("/app/vehicles");
    return { success: true, driverId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el conductor." };
  }
}

export async function setDriverStatus(
  organizationId: string,
  driverId: string,
  status: "active" | "inactive"
): Promise<DriverActionResult> {
  if (status === "inactive") {
    return removeDriver(organizationId, driverId);
  }

  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, user_id")
      .eq("id", driverId)
      .eq("organization_id", organizationId)
      .single();

    if (!driver) {
      return { success: false, error: "Conductor no encontrado." };
    }

    const { error } = await supabase
      .from("drivers")
      .update({ status: "active" })
      .eq("id", driverId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    if (driver.user_id) {
      await supabase
        .from("organization_members")
        .update({ status: "active", role: "driver" })
        .eq("organization_id", organizationId)
        .eq("user_id", driver.user_id);
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_activated",
      entity: "drivers",
      entityId: driverId,
      newState: { status: "active" },
    });

    revalidatePath("/app/drivers");
    return { success: true, driverId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el conductor." };
  }
}
