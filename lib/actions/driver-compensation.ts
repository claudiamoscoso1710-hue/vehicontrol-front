"use server";

import { callBackendForm, callBackendJson } from "@/lib/api/backend";

export type CompensationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveDriverCompensationSettings(
  organizationId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  return callBackendForm(
    "/api/actions/compensation/save-settings",
    organizationId,
    formData
  );
}

export async function updateDriverCommission(
  organizationId: string,
  driverId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  formData.set("driverId", driverId);
  return callBackendForm(
    "/api/actions/compensation/update-commission",
    organizationId,
    formData
  );
}

export async function createDriverAdvance(
  organizationId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  return callBackendForm(
    "/api/actions/compensation/create-advance",
    organizationId,
    formData
  );
}

export async function getDriverCompensationConfigForOrg(organizationId: string) {
  const token = await (await import("@/lib/supabase/server")).createClient();
  const {
    data: { session },
  } = await token.auth.getSession();
  const backend =
    process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL ?? "";
  const response = await fetch(
    `${backend.replace(/\/$/, "")}/api/actions/compensation/config/${organizationId}`,
    {
      headers: {
        Authorization: `Bearer ${session?.access_token ?? ""}`,
      },
      cache: "no-store",
    }
  );
  return response.json();
}
