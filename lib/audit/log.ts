import type { SupabaseClient } from "@supabase/supabase-js";

type AuditParams = {
  organizationId: string;
  userId: string;
  action: string;
  entity: string;
  entityId?: string;
  previousState?: Record<string, unknown> | null;
  newState?: Record<string, unknown> | null;
};

export async function writeAuditLog(
  supabase: SupabaseClient,
  params: AuditParams
) {
  await supabase.from("audit_log").insert({
    organization_id: params.organizationId,
    user_id: params.userId,
    action: params.action,
    entity: params.entity,
    entity_id: params.entityId ?? null,
    previous_state: params.previousState ?? null,
    new_state: params.newState ?? null,
  });
}
