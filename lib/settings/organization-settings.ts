import { cache } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

async function getOrganizationSettingImpl<T>(
  supabase: SupabaseClient,
  organizationId: string,
  key: string,
  parse: (value: unknown) => T,
  defaultValue: T
): Promise<T> {
  const { data } = await supabase
    .from("organization_settings")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("key", key)
    .maybeSingle();

  if (!data?.value) {
    return defaultValue;
  }

  return parse(data.value);
}

export const getOrganizationSetting = cache(getOrganizationSettingImpl);
