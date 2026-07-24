"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type DriverTripActionResult =
  | { success: true; tripId?: string }
  | { success: false; error: string };

export async function driverRegisterTrip(
  organizationId: string,
  formData: FormData
): Promise<DriverTripActionResult> {
  return callBackendForm("/api/actions/driver-trips/register", organizationId, formData);
}

export async function driverStartTrip(
  tripId: string,
  organizationId: string
): Promise<DriverTripActionResult> {
  return callBackendJson("/api/actions/driver-trips/start", {
    organizationId,
    tripId,
  });
}

export async function driverUpdateTrip(
  organizationId: string,
  tripId: string,
  formData: FormData
): Promise<DriverTripActionResult> {
  formData.set("tripId", tripId);
  return callBackendForm("/api/actions/driver-trips/update", organizationId, formData);
}

export async function driverFinishTrip(
  tripId: string,
  organizationId: string
): Promise<DriverTripActionResult> {
  return callBackendJson("/api/actions/driver-trips/finish", {
    organizationId,
    tripId,
  });
}
