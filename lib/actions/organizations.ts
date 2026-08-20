"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { createClient } from "@/lib/supabase/server";

export type OrganizationActionResult =
  | { success: true; organizationId?: string }
  | { success: false; error: string };

async function requireSuperAdmin(supabase: Awaited<ReturnType<typeof createClient>>) {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("No autenticado");

  const { data: membership } = await supabase
    .from("organization_members")
    .select("id")
    .eq("user_id", user.id)
    .eq("role", "super_admin")
    .eq("status", "active")
    .maybeSingle();

  if (!membership) throw new Error("Solo super admin puede realizar esta acción.");

  return user.id;
}

function validatePassword(password: string): string | null {
  if (password.length < 8) {
    return "La contraseña debe tener al menos 8 caracteres.";
  }
  return null;
}

async function setAuthPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  ownerUserId: string,
  password: string
) {
  const { error } = await supabase.rpc("super_admin_reset_owner_password", {
    p_organization_id: organizationId,
    p_owner_user_id: ownerUserId,
    p_new_password: password,
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function ensureOwnerUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ownerEmail: string,
  password: string,
  fullName?: string
): Promise<string> {
  const { data, error } = await supabase.rpc("super_admin_ensure_owner_user", {
    p_email: ownerEmail,
    p_password: password,
    p_full_name: fullName ?? null,
  });

  if (error || !data) {
    throw new Error(error?.message ?? "No se pudo crear el usuario propietario.");
  }

  return data as string;
}

async function persistOwnerPassword(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  ownerUserId: string,
  password: string,
  updatedBy: string
) {
  void updatedBy;
  await setAuthPassword(supabase, organizationId, ownerUserId, password);
}

async function assignOwnerMembership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  ownerUserId: string
) {
  await supabase
    .from("organization_members")
    .update({ status: "inactive" })
    .eq("organization_id", organizationId)
    .eq("role", "owner")
    .neq("user_id", ownerUserId);

  const { error } = await supabase.from("organization_members").upsert(
    {
      organization_id: organizationId,
      user_id: ownerUserId,
      role: "owner",
      status: "active",
    },
    { onConflict: "organization_id,user_id" }
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function createOrganization(
  formData: FormData
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const name = String(formData.get("name") ?? "").trim();
    const ownerEmail = String(formData.get("ownerEmail") ?? "").trim().toLowerCase();
    const ownerPassword = String(formData.get("ownerPassword") ?? "");

    if (!name) {
      return { success: false, error: "El nombre de la organización es obligatorio." };
    }

    if (ownerEmail && ownerPassword) {
      const passwordError = validatePassword(ownerPassword);
      if (passwordError) {
        return { success: false, error: passwordError };
      }
    }

    if (ownerEmail && !ownerPassword) {
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("email", ownerEmail)
        .maybeSingle();

      if (!existingProfile) {
        return {
          success: false,
          error:
            "Si el propietario no existe, debes indicar una contraseña inicial.",
        };
      }
    }

    const { data: org, error: orgError } = await supabase
      .from("organizations")
      .insert({ name, status: "active" })
      .select("id")
      .single();

    if (orgError || !org) {
      return {
        success: false,
        error: orgError?.message ?? "No se pudo crear la organización.",
      };
    }

    const { data: plan } = await supabase
      .from("plans")
      .select("id")
      .limit(1)
      .maybeSingle();

    if (plan) {
      await supabase.from("subscriptions").insert({
        organization_id: org.id,
        plan_id: plan.id,
        status: "active",
      });
    }

    if (ownerEmail) {
      let ownerUserId: string;

      if (ownerPassword) {
        ownerUserId = await ensureOwnerUser(supabase, ownerEmail, ownerPassword, name);
        await assignOwnerMembership(supabase, org.id, ownerUserId);
        await persistOwnerPassword(supabase, org.id, ownerUserId, ownerPassword, userId);
      } else {
        const { data: profile } = await supabase
          .from("profiles")
          .select("id")
          .eq("email", ownerEmail)
          .maybeSingle();

        if (profile) {
          ownerUserId = profile.id;
          await assignOwnerMembership(supabase, org.id, ownerUserId);
        }
      }
    }

    await writeAuditLog(supabase, {
      organizationId: org.id,
      userId,
      action: "organization_created",
      entity: "organizations",
      entityId: org.id,
      newState: { name, ownerEmail: ownerEmail || null },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/organizations");

    return { success: true, organizationId: org.id };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al crear organización.",
    };
  }
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: "active" | "suspended" | "cancelled"
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const { error } = await supabase
      .from("organizations")
      .update({ status })
      .eq("id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "organization_status_updated",
      entity: "organizations",
      entityId: organizationId,
      newState: { status },
    });

    revalidatePath("/admin");
    revalidatePath("/admin/organizations");

    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al actualizar organización.",
    };
  }
}

export async function updateOrganizationName(
  organizationId: string,
  name: string
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const trimmed = name.trim();
    if (!trimmed) {
      return { success: false, error: "El nombre es obligatorio." };
    }

    const { error } = await supabase
      .from("organizations")
      .update({ name: trimmed })
      .eq("id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "organization_renamed",
      entity: "organizations",
      entityId: organizationId,
      newState: { name: trimmed },
    });

    revalidatePath("/admin/organizations");
    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al renombrar.",
    };
  }
}

export async function setOrganizationOwner(
  organizationId: string,
  ownerEmail: string,
  ownerPassword?: string
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const email = ownerEmail.trim().toLowerCase();
    if (!email) {
      return { success: false, error: "El email del propietario es obligatorio." };
    }

    const password = ownerPassword?.trim() ?? "";
    if (password) {
      const passwordError = validatePassword(password);
      if (passwordError) {
        return { success: false, error: passwordError };
      }
    }

    let ownerUserId: string;

    if (password) {
      ownerUserId = await ensureOwnerUser(supabase, email, password);
      await assignOwnerMembership(supabase, organizationId, ownerUserId);
      await persistOwnerPassword(
        supabase,
        organizationId,
        ownerUserId,
        password,
        userId
      );
    } else {
      const { data: profile } = await supabase
        .from("profiles")
        .select("id, email, full_name")
        .eq("email", email)
        .maybeSingle();

      if (!profile) {
        return {
          success: false,
          error:
            "No existe un usuario con ese email. Indica una contraseña para crearlo.",
        };
      }
      ownerUserId = profile.id;
      await assignOwnerMembership(supabase, organizationId, ownerUserId);
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "organization_owner_assigned",
      entity: "organization_members",
      entityId: ownerUserId,
      newState: { ownerEmail: email, passwordUpdated: Boolean(password) },
    });

    revalidatePath("/admin/organizations");
    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al asignar propietario.",
    };
  }
}

export async function resetOrganizationOwnerPassword(
  organizationId: string,
  ownerUserId: string,
  newPassword: string
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const adminUserId = await requireSuperAdmin(supabase);

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return { success: false, error: passwordError };
    }

    const { data: membership } = await supabase
      .from("organization_members")
      .select("id")
      .eq("organization_id", organizationId)
      .eq("user_id", ownerUserId)
      .eq("role", "owner")
      .eq("status", "active")
      .maybeSingle();

    if (!membership) {
      return { success: false, error: "El usuario no es propietario activo de esta flota." };
    }

    await setAuthPassword(supabase, organizationId, ownerUserId, newPassword);

    await writeAuditLog(supabase, {
      organizationId,
      userId: adminUserId,
      action: "organization_owner_password_reset",
      entity: "organization_members",
      entityId: ownerUserId,
      newState: { passwordUpdated: true },
    });

    revalidatePath("/admin/organizations");
    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error ? error.message : "Error al cambiar la contraseña.",
    };
  }
}

export async function updateOrganizationOwnerEmail(
  organizationId: string,
  ownerUserId: string,
  newEmail: string
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const adminUserId = await requireSuperAdmin(supabase);

    const email = newEmail.trim().toLowerCase();
    if (!email || !email.includes("@")) {
      return { success: false, error: "Email inválido." };
    }

    const { error } = await supabase.rpc("super_admin_update_owner_email", {
      p_organization_id: organizationId,
      p_owner_user_id: ownerUserId,
      p_new_email: email,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId: adminUserId,
      action: "organization_owner_email_updated",
      entity: "organization_members",
      entityId: ownerUserId,
      newState: { ownerEmail: email },
    });

    revalidatePath("/admin/organizations");
    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al cambiar el email.",
    };
  }
}

export async function removeOrganizationOwner(
  organizationId: string,
  memberUserId: string
): Promise<OrganizationActionResult> {
  try {
    const supabase = await createClient();
    const userId = await requireSuperAdmin(supabase);

    const { error } = await supabase
      .from("organization_members")
      .update({ status: "inactive" })
      .eq("organization_id", organizationId)
      .eq("user_id", memberUserId)
      .eq("role", "owner");

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "organization_owner_removed",
      entity: "organization_members",
      entityId: memberUserId,
    });

    revalidatePath("/admin/organizations");
    return { success: true, organizationId };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error al quitar propietario.",
    };
  }
}
