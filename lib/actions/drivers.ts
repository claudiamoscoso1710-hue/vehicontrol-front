"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type DriverActionResult =
  | { success: true; driverId?: string }
  | { success: false; error: string };

export async function createDriver(
  organizationId: string,
  formData: FormData
): Promise<DriverActionResult> {
  return callBackendForm("/api/actions/drivers/create", organizationId, formData);
}

export async function setDriverStatus(
  organizationId: string,
  driverId: string,
  status: "active" | "inactive"
): Promise<DriverActionResult> {
  return callBackendJson("/api/actions/drivers/set-status", {
    organizationId,
    driverId,
    status,
  });
}
