"use server";

import { callBackendJson } from "@/lib/api/backend";

export type SettlementActionResult =
  | { success: true }
  | { success: false; error: string };

export async function createDriverSettlement(
  organizationId: string,
  driverId: string
): Promise<SettlementActionResult> {
  return callBackendJson("/api/actions/settlements/create", {
    organizationId,
    driverId,
  });
}
