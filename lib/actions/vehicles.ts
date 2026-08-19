"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type VehicleActionResult =
  | { success: true; vehicleId?: string }
  | { success: false; error: string };

export async function createVehicleBySuperAdmin(
  formData: FormData
): Promise<VehicleActionResult> {
  return callBackendForm("/api/actions/vehicles/create", "", formData);
}

export async function updateVehicleBySuperAdmin(
  vehicleId: string,
  formData: FormData
): Promise<VehicleActionResult> {
  formData.set("vehicleId", vehicleId);
  return callBackendForm("/api/actions/vehicles/update", "", formData);
}

export async function deactivateVehicleBySuperAdmin(
  vehicleId: string
): Promise<VehicleActionResult> {
  return callBackendJson("/api/actions/vehicles/deactivate", { vehicleId });
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
