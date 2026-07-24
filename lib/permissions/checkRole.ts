import type { SupabaseClient } from "@supabase/supabase-js";
import type { MemberRole } from "./roles";

export class RoleError extends Error {
  constructor(message = "Insufficient permissions") {
    super(message);
    this.name = "RoleError";
  }
}

type RequireRoleResult = {
  userId: string;
  role: MemberRole;
};

export async function requireRole(
  supabase: SupabaseClient,
  organizationId: string,
  allowedRoles: MemberRole[]
): Promise<RequireRoleResult> {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new RoleError("No autenticado.");
  }

  const { data: memberships, error: memberError } = await supabase
    .from("organization_members")
    .select("role")
    .eq("organization_id", organizationId)
    .eq("user_id", user.id)
    .eq("status", "active");

  if (memberError) {
    throw new RoleError("No se pudo verificar tu membresía.");
  }

  if (allowedRoles.includes("driver")) {
    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", user.id)
      .eq("status", "active")
      .maybeSingle();

    if (driver) {
      return { userId: user.id, role: "driver" };
    }
  }

  if (!memberships || memberships.length === 0) {
    throw new RoleError("No perteneces a esta organización.");
  }

  const roles = memberships.map((m) => m.role as MemberRole);

  if (roles.includes("super_admin") || allowedRoles.some((r) => roles.includes(r))) {
    const effectiveRole = roles.includes("super_admin")
      ? "super_admin"
      : (roles.find((r) => allowedRoles.includes(r)) as MemberRole);

    return { userId: user.id, role: effectiveRole };
  }

  throw new RoleError("No tienes permisos para esta acción.");
}
