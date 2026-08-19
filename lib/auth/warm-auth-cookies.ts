import type { SupabaseClient } from "@supabase/supabase-js";
import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import { setCachedOrgCookie } from "@/lib/auth/org-cookie";
import { setCachedRoleCookie } from "@/lib/auth/role-cookie";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import {
  getHighestPriorityRole,
  type MemberRole,
} from "@/lib/permissions/roles";

export async function warmAuthCookies(
  supabase: SupabaseClient,
  cookieStore: ReadonlyRequestCookies,
  userId: string
) {
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organization_id, organizations(id, name)")
    .eq("user_id", userId)
    .eq("status", "active");

  const roles = (memberships ?? []).map((m) => m.role as MemberRole);
  let primaryRole = getHighestPriorityRole(roles);

  if (!primaryRole) {
    const { data: driverProfile } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .eq("status", "active")
      .maybeSingle();

    if (driverProfile) {
      primaryRole = "driver";
    }
  }

  if (!primaryRole) return;

  setCachedRoleCookie(cookieStore, userId, primaryRole);

  if (["owner", "admin", "accountant"].includes(primaryRole)) {
    const org = await getActiveOrganization(supabase, userId);
    if (org) {
      setCachedOrgCookie(cookieStore, userId, org);
    }
  }
}
