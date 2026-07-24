import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberRole } from "@/lib/permissions/roles";

export type ActiveOrganization = {
  organizationId: string;
  organizationName: string;
  role: MemberRole;
};

export async function getActiveOrganization(
  supabase: SupabaseClient,
  userId: string
): Promise<ActiveOrganization | null> {
  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role, organization_id, organizations(id, name)")
    .eq("user_id", userId)
    .eq("status", "active")
    .in("role", ["owner", "admin", "accountant"]);

  if (!memberships || memberships.length === 0) return null;

  const priority: MemberRole[] = ["owner", "admin", "accountant"];
  const sorted = [...memberships].sort(
    (a, b) =>
      priority.indexOf(a.role as MemberRole) -
      priority.indexOf(b.role as MemberRole)
  );

  const membership = sorted[0];
  const orgData = membership.organizations;
  const org = Array.isArray(orgData) ? orgData[0] : orgData;

  return {
    organizationId: membership.organization_id,
    organizationName: (org as { name: string } | null)?.name ?? "Organización",
    role: membership.role as MemberRole,
  };
}
