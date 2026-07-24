"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type TripActionResult =
  | { success: true; tripId?: string }
  | { success: false; error: string };

export async function createTrip(
  organizationId: string,
  formData: FormData
): Promise<TripActionResult> {
  return callBackendForm("/api/actions/trips/create", organizationId, formData);
}

export async function startTrip(
  tripId: string,
  organizationId: string
): Promise<TripActionResult> {
  return callBackendJson("/api/actions/trips/start", { organizationId, tripId });
}

export async function closeTrip(
  tripId: string,
  organizationId: string
): Promise<TripActionResult> {
  return callBackendJson("/api/actions/trips/close", { organizationId, tripId });
}
