import type { SupabaseClient } from "@supabase/supabase-js";

export async function getOrganizationSetting<T>(
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
