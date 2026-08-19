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

export async function updateOrganizationName(
  organizationId: string,
  name: string
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/update-name", {
    organizationId,
    name,
  });
}

export async function setOrganizationOwner(
  organizationId: string,
  ownerEmail: string,
  ownerPassword?: string
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/set-owner", {
    organizationId,
    ownerEmail,
    ownerPassword,
  });
}

export async function resetOrganizationOwnerPassword(
  organizationId: string,
  ownerUserId: string,
  newPassword: string
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/reset-owner-password", {
    organizationId,
    ownerUserId,
    newPassword,
  });
}

export async function updateOrganizationOwnerEmail(
  organizationId: string,
  ownerUserId: string,
  newEmail: string
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/update-owner-email", {
    organizationId,
    ownerUserId,
    newEmail,
  });
}

export async function removeOrganizationOwner(
  organizationId: string,
  userId: string
): Promise<OrganizationActionResult> {
  return callBackendJson("/api/actions/organizations/remove-owner", {
    organizationId,
    userId,
  });
}
