"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type VehicleActionResult =
  | { success: true }
  | { success: false; error: string };

export async function requestVehicle(
  organizationId: string,
  formData: FormData
): Promise<VehicleActionResult> {
  return callBackendForm("/api/actions/vehicles/request", organizationId, formData);
}

export async function reviewVehicleCommercialStatus(
  vehicleId: string,
  decision: "active" | "cancelled"
): Promise<VehicleActionResult> {
  return callBackendJson("/api/actions/vehicles/review-status", {
    vehicleId,
    decision,
  });
}

export async function assignVehicleDriver(
  vehicleId: string,
  organizationId: string,
  driverId: string | null
): Promise<VehicleActionResult> {
  return callBackendJson("/api/actions/vehicles/assign-driver", {
    vehicleId,
    organizationId,
    driverId,
  });
}
