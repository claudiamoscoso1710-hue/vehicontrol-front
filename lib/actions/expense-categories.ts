"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";
import type { ExpenseCategoryScope } from "@/lib/expenses/expense-scope";

export type CategoryActionResult =
  | { success: true; categoryId?: string }
  | { success: false; error: string };

function parseScope(value: FormDataEntryValue | null): "trip" | "vehicle" {
  const scope = String(value ?? "trip").trim();
  return scope === "vehicle" ? "vehicle" : "trip";
}

export async function createExpenseCategory(
  organizationId: string,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "accountant",
    ]);

    const name = String(formData.get("name") ?? "").trim();
    const requiresEvidence = formData.get("requiresEvidence") === "on";
    const scope = parseScope(formData.get("scope"));

    if (!name) {
      return { success: false, error: "El nombre es obligatorio." };
    }

    const { data: category, error } = await supabase
      .from("expense_categories")
      .insert({
        organization_id: organizationId,
        name,
        requires_evidence: requiresEvidence,
        scope,
      })
      .select("id")
      .single();

    if (error || !category) {
      return { success: false, error: error?.message ?? "No se pudo crear la categoría." };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "expense_category_created",
      entity: "expense_categories",
      entityId: category.id,
      newState: { name, requires_evidence: requiresEvidence, scope },
    });

    revalidatePath("/app/settings");
    revalidatePath("/driver");
    revalidatePath("/driver/vehicle-expenses");

    return { success: true, categoryId: category.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear categoría." };
  }
}

export async function updateExpenseCategory(
  organizationId: string,
  categoryId: string,
  formData: FormData
): Promise<CategoryActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "accountant",
    ]);

    const name = String(formData.get("name") ?? "").trim();
    const requiresEvidence = formData.get("requiresEvidence") === "on";

    if (!name) {
      return { success: false, error: "El nombre es obligatorio." };
    }

    const { error } = await supabase
      .from("expense_categories")
      .update({
        name,
        requires_evidence: requiresEvidence,
      })
      .eq("id", categoryId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "expense_category_updated",
      entity: "expense_categories",
      entityId: categoryId,
      newState: { name, requires_evidence: requiresEvidence },
    });

    revalidatePath("/app/settings");
    revalidatePath("/driver");
    revalidatePath("/driver/vehicle-expenses");

    return { success: true, categoryId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar categoría." };
  }
}

export async function deleteExpenseCategory(
  organizationId: string,
  categoryId: string
): Promise<CategoryActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "accountant",
    ]);

    const { error } = await supabase
      .from("expense_categories")
      .delete()
      .eq("id", categoryId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "expense_category_deleted",
      entity: "expense_categories",
      entityId: categoryId,
      newState: null,
    });

    revalidatePath("/app/settings");

    return { success: true, categoryId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar categoría." };
  }
}

export type ExpenseCategoryRow = {
  id: string;
  name: string;
  requires_evidence: boolean;
  scope: ExpenseCategoryScope;
};
