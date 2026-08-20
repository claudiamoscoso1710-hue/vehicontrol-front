"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";
import type { MemberRole } from "@/lib/permissions/roles";

export type MemberActionResult =
  | { success: true }
  | { success: false; error: string };

const INVITABLE_ROLES: MemberRole[] = ["admin", "accountant", "driver"];

export async function addOrganizationMember(
  organizationId: string,
  formData: FormData
): Promise<MemberActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["owner"]);

    const email = String(formData.get("email") ?? "").trim().toLowerCase();
    const role = String(formData.get("role") ?? "") as MemberRole;

    if (!email) {
      return { success: false, error: "El email es obligatorio." };
    }

    if (!INVITABLE_ROLES.includes(role)) {
      return { success: false, error: "Rol no válido para invitación." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("id, email")
      .eq("email", email)
      .maybeSingle();

    if (!profile) {
      return {
        success: false,
        error:
          "Usuario no encontrado. Debe registrarse primero en la plataforma (login demo).",
      };
    }

    const { data: existing } = await supabase
      .from("organization_members")
      .select("id, status")
      .eq("organization_id", organizationId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (existing?.status === "active") {
      return { success: false, error: "Este usuario ya es miembro activo." };
    }

    if (existing) {
      const { error } = await supabase
        .from("organization_members")
        .update({ role, status: "active" })
        .eq("id", existing.id);

      if (error) return { success: false, error: error.message };
    } else {
      const { error } = await supabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: profile.id,
        role,
        status: "active",
      });

      if (error) return { success: false, error: error.message };
    }

    if (role === "driver") {
      const driverName = String(formData.get("driverName") ?? "").trim();
      const { data: driver } = await supabase
        .from("drivers")
        .select("id")
        .eq("organization_id", organizationId)
        .eq("user_id", profile.id)
        .maybeSingle();

      if (!driver) {
        await supabase.from("drivers").insert({
          organization_id: organizationId,
          user_id: profile.id,
          full_name: driverName || profile.email,
          status: "active",
        });
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "member_added",
      entity: "organization_members",
      entityId: profile.id,
      newState: { email, role },
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/drivers");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al agregar miembro." };
  }
}

export async function linkDriverToUser(
  organizationId: string,
  driverId: string,
  email: string
): Promise<MemberActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const normalizedEmail = email.trim().toLowerCase();
    const { data: profile } = await supabase
      .from("profiles")
      .select("id")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (!profile) {
      return { success: false, error: "Usuario no encontrado con ese email." };
    }

    const { error: driverError } = await supabase
      .from("drivers")
      .update({ user_id: profile.id })
      .eq("id", driverId)
      .eq("organization_id", organizationId);

    if (driverError) {
      return { success: false, error: driverError.message };
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", profile.id)
      .maybeSingle();

    if (!membership) {
      await supabase.from("organization_members").insert({
        organization_id: organizationId,
        user_id: profile.id,
        role: "driver",
        status: "active",
      });
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_linked",
      entity: "drivers",
      entityId: driverId,
      newState: { user_id: profile.id, email: normalizedEmail },
    });

    revalidatePath("/app/drivers");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al vincular conductor." };
  }
}
