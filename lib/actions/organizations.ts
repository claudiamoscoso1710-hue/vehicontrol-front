"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type OrganizationActionResult =
  | { success: true; organizationId?: string }
  | { success: false; error: string };

export async function createOrganization(
  formData: FormData
): Promise<OrganizationActionResult> {
  return callBackendForm("/api/actions/organizations/create", "", formData);
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: "active" | "suspended" | "cancelled"
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/update-status", {
    organizationId,
    status,
  });
}
