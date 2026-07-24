import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveDriverPeriodContext,
  type SettlementPeriodContext,
} from "@/lib/reports/settlement-period";

export async function loadVehiclePeriodContext(
  supabase: SupabaseClient,
  organizationId: string,
  assignedDriverId: string | null,
  periodParam?: string | null
): Promise<SettlementPeriodContext | null> {
  if (!assignedDriverId) return null;

  return resolveDriverPeriodContext(
    supabase,
    organizationId,
    assignedDriverId,
    periodParam
  );
}
