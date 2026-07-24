"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type MemberActionResult =
  | { success: true }
  | { success: false; error: string };

export async function addOrganizationMember(
  organizationId: string,
  formData: FormData
): Promise<MemberActionResult> {
  return callBackendForm("/api/actions/members/add", organizationId, formData);
}

export async function linkDriverToUser(
  organizationId: string,
  driverId: string,
  email: string
): Promise<MemberActionResult> {
  return callBackendJson("/api/actions/members/link-driver", {
    organizationId,
    driverId,
    email,
  });
}
