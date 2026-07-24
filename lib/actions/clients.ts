"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type ClientActionResult =
  | { success: true; clientId?: string }
  | { success: false; error: string };

export async function createOrgClient(
  organizationId: string,
  formData: FormData
): Promise<ClientActionResult> {
  return callBackendForm("/api/actions/clients/create", organizationId, formData);
}

export async function setTripFreightPaid(
  organizationId: string,
  tripId: string,
  paid: boolean
): Promise<ClientActionResult> {
  return callBackendJson("/api/actions/clients/set-freight-paid", {
    organizationId,
    tripId,
    paid,
  });
}
