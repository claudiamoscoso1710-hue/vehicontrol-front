"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type DriverActionResult =
  | { success: true; driverId?: string }
  | { success: false; error: string };

async function safeBackend<T extends DriverActionResult>(
  action: () => Promise<T>
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : "Error de conexión con el servidor.",
    } as T;
  }
}

export async function createDriver(
  organizationId: string,
  formData: FormData
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendForm("/api/actions/drivers/create", organizationId, formData)
  );
}

export async function updateDriverProfile(
  organizationId: string,
  driverId: string,
  formData: FormData
): Promise<DriverActionResult> {
  return safeBackend(() => {
    formData.set("driverId", driverId);
    return callBackendForm(
      "/api/actions/drivers/update-profile",
      organizationId,
      formData
    );
  });
}

export async function updateDriverEmail(
  organizationId: string,
  driverId: string,
  newEmail: string
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendJson("/api/actions/drivers/update-email", {
      organizationId,
      driverId,
      newEmail,
    })
  );
}

export async function updateDriverPassword(
  organizationId: string,
  driverId: string,
  newPassword: string
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendJson("/api/actions/drivers/update-password", {
      organizationId,
      driverId,
      newPassword,
    })
  );
}

export async function assignDriverToVehicle(
  organizationId: string,
  driverId: string,
  vehicleId: string | null
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendJson("/api/actions/drivers/assign-vehicle", {
      organizationId,
      driverId,
      vehicleId,
    })
  );
}

export async function removeDriver(
  organizationId: string,
  driverId: string
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendJson("/api/actions/drivers/remove", {
      organizationId,
      driverId,
    })
  );
}

export async function setDriverStatus(
  organizationId: string,
  driverId: string,
  status: "active" | "inactive"
): Promise<DriverActionResult> {
  return safeBackend(() =>
    callBackendJson("/api/actions/drivers/set-status", {
      organizationId,
      driverId,
      status,
    })
  );
}
