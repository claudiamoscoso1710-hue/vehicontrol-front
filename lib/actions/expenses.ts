"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { parseMoneyValue } from "@/lib/format";
import { buildExpenseNotes, isOthersCategory } from "@/lib/expenses/category-utils";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type ActionResult =
  | { success: true; expenseId?: string }
  | { success: false; error: string };

async function resolveCategoryName(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  categoryId: string
): Promise<string | null> {
  const { data } = await supabase
    .from("expense_categories")
    .select("name")
    .eq("id", categoryId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  return data?.name ?? null;
}

async function getValidatedEvidence(
  evidence: FormDataEntryValue | null
): Promise<{ ok: true; file: File } | { ok: false; error: string } | { ok: true; file: null }> {
  if (!(evidence instanceof File) || evidence.size === 0) {
    return { ok: true, file: null };
  }

  const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

  if (evidence.size > MAX_EVIDENCE_BYTES) {
    return {
      ok: false,
      error: `La evidencia supera el límite de ${MAX_EVIDENCE_BYTES / (1024 * 1024)} MB. Intenta con una foto más pequeña.`,
    };
  }

  return { ok: true, file: evidence };
}

async function uploadExpenseEvidence(
  supabase: Awaited<ReturnType<typeof createClient>>,
  params: {
    organizationId: string;
    vehicleId: string;
    expenseId: string;
    evidence: File;
  }
): Promise<{ ok: true } | { ok: false; error: string }> {
  const extension = params.evidence.name.split(".").pop() ?? "jpg";
  const storagePath = `${params.organizationId}/${params.vehicleId}/${params.expenseId}/evidence.${extension}`;

  const { error: uploadError } = await supabase.storage
    .from("expense-evidences")
    .upload(storagePath, params.evidence, {
      contentType: params.evidence.type,
      upsert: false,
    });

  if (uploadError) {
    return { ok: false, error: uploadError.message };
  }

  const { error: evidenceError } = await supabase
    .from("expense_evidences")
    .insert({
      expense_id: params.expenseId,
      organization_id: params.organizationId,
      storage_path: storagePath,
    });

  if (evidenceError) {
    await supabase.storage.from("expense-evidences").remove([storagePath]);
    return { ok: false, error: evidenceError.message };
  }

  return { ok: true };
}

export async function submitDriverExpense(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const organizationId = String(formData.get("organizationId") ?? "");
    const tripId = String(formData.get("tripId") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "");
    const amount = parseMoneyValue(formData.get("amount"));
    const notes = String(formData.get("notes") ?? "").trim();
    const customDescription = String(formData.get("customDescription") ?? "").trim();
    const evidence = formData.get("evidence");

    if (!organizationId || !tripId || !categoryId || !amount || amount <= 0) {
      return { success: false, error: "Completa todos los campos obligatorios." };
    }

    const categoryName = await resolveCategoryName(
      supabase,
      organizationId,
      categoryId
    );
    if (!categoryName) {
      return { success: false, error: "Categoría no válida." };
    }
    if (isOthersCategory(categoryName) && !customDescription) {
      return {
        success: false,
        error: "Describe de qué es el gasto cuando eliges Otros.",
      };
    }

    const expenseNotes = buildExpenseNotes(categoryName, customDescription, notes);

    const evidenceResult = await getValidatedEvidence(evidence);
    if (!evidenceResult.ok) {
      return { success: false, error: evidenceResult.error };
    }

    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!driver) {
      return { success: false, error: "No tienes perfil de conductor activo." };
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("id, vehicle_id, driver_id, status")
      .eq("id", tripId)
      .eq("organization_id", organizationId)
      .single();

    if (!trip || trip.driver_id !== driver.id) {
      return { success: false, error: "Viaje no válido para este conductor." };
    }

    if (trip.status !== "in_progress") {
      return { success: false, error: "Solo puedes reportar gastos en viajes activos." };
    }

    if (!trip.vehicle_id) {
      return { success: false, error: "El viaje no tiene vehículo asociado." };
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        organization_id: organizationId,
        trip_id: tripId,
        vehicle_id: trip.vehicle_id,
        driver_id: driver.id,
        category_id: categoryId,
        amount,
        status: "approved",
        notes: expenseNotes,
      })
      .select("id")
      .single();

    if (expenseError || !expense) {
      const message = expenseError?.message ?? "No se pudo crear el gasto.";
      if (message.toLowerCase().includes("row-level security")) {
        return {
          success: false,
          error:
            "No tienes permiso para registrar gastos. Pide a tu empresa que vincule tu usuario como conductor.",
        };
      }
      return { success: false, error: message };
    }

    if (evidenceResult.file) {
      const uploaded = await uploadExpenseEvidence(supabase, {
        organizationId,
        vehicleId: trip.vehicle_id,
        expenseId: expense.id,
        evidence: evidenceResult.file,
      });

      if (!uploaded.ok) {
        await supabase.from("expenses").delete().eq("id", expense.id);
        return { success: false, error: uploaded.error };
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "expense_submitted",
      entity: "expenses",
      entityId: expense.id,
      newState: { amount, trip_id: tripId, status: "approved" },
    });

    revalidatePath("/driver");
    revalidatePath("/app");
    revalidatePath(`/app/trips/${tripId}`);

    return { success: true, expenseId: expense.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error inesperado al registrar el gasto." };
  }
}

export async function submitDriverVehicleExpense(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const organizationId = String(formData.get("organizationId") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "");
    const amount = parseMoneyValue(formData.get("amount"));
    const notes = String(formData.get("notes") ?? "").trim();
    const customDescription = String(formData.get("customDescription") ?? "").trim();
    const evidence = formData.get("evidence");

    if (!organizationId || !categoryId || !amount || amount <= 0) {
      return { success: false, error: "Completa todos los campos obligatorios." };
    }

    const evidenceResult = await getValidatedEvidence(evidence);
    if (!evidenceResult.ok) {
      return { success: false, error: evidenceResult.error };
    }

    const categoryName = await resolveCategoryName(
      supabase,
      organizationId,
      categoryId
    );
    if (!categoryName) {
      return { success: false, error: "Categoría no válida." };
    }
    if (isOthersCategory(categoryName) && !customDescription) {
      return {
        success: false,
        error: "Describe de qué es el gasto cuando eliges Otros.",
      };
    }

    const expenseNotes = buildExpenseNotes(categoryName, customDescription, notes);

    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!driver) {
      return { success: false, error: "No tienes perfil de conductor activo." };
    }

    const { data: assignedVehicle } = await supabase
      .from("vehicles")
      .select("id, commercial_status")
      .eq("organization_id", organizationId)
      .eq("assigned_driver_id", driver.id)
      .eq("commercial_status", "active")
      .maybeSingle();

    if (!assignedVehicle) {
      return {
        success: false,
        error: "No tienes un vehículo asignado. Pide a tu empresa que te asigne uno.",
      };
    }

    const vehicleId = assignedVehicle.id;
    const vehicle = assignedVehicle;

    if (!vehicle || vehicle.commercial_status !== "active") {
      return { success: false, error: "Tu vehículo asignado no está disponible." };
    }

    const { data: expense, error: expenseError } = await supabase
      .from("expenses")
      .insert({
        organization_id: organizationId,
        trip_id: null,
        vehicle_id: vehicleId,
        driver_id: driver.id,
        category_id: categoryId,
        amount,
        status: "approved",
        notes: expenseNotes,
      })
      .select("id")
      .single();

    if (expenseError || !expense) {
      const message = expenseError?.message ?? "No se pudo crear el gasto.";
      if (message.toLowerCase().includes("row-level security")) {
        return {
          success: false,
          error:
            "No tienes permiso para registrar gastos. Pide a tu empresa que vincule tu usuario como conductor.",
        };
      }
      return { success: false, error: message };
    }

    if (evidenceResult.file) {
      const uploaded = await uploadExpenseEvidence(supabase, {
        organizationId,
        vehicleId,
        expenseId: expense.id,
        evidence: evidenceResult.file,
      });

      if (!uploaded.ok) {
        await supabase.from("expenses").delete().eq("id", expense.id);
        return { success: false, error: uploaded.error };
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "vehicle_expense_submitted",
      entity: "expenses",
      entityId: expense.id,
      newState: { amount, vehicle_id: vehicleId, status: "approved" },
    });

    revalidatePath("/driver");
    revalidatePath("/driver/vehicle-expenses");
    revalidatePath("/app");
    revalidatePath(`/app/vehicles/${vehicleId}`);

    return { success: true, expenseId: expense.id };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al registrar el gasto del vehículo." };
  }
}

export async function driverUpdateExpense(
  formData: FormData
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const organizationId = String(formData.get("organizationId") ?? "");
    const expenseId = String(formData.get("expenseId") ?? "");
    const categoryId = String(formData.get("categoryId") ?? "");
    const amount = parseMoneyValue(formData.get("amount"));
    const notes = String(formData.get("notes") ?? "").trim();
    const customDescription = String(formData.get("customDescription") ?? "").trim();
    const evidence = formData.get("evidence");

    if (!organizationId || !expenseId || !categoryId || !amount || amount <= 0) {
      return { success: false, error: "Completa todos los campos obligatorios." };
    }

    const categoryName = await resolveCategoryName(
      supabase,
      organizationId,
      categoryId
    );
    if (!categoryName) {
      return { success: false, error: "Categoría no válida." };
    }
    if (isOthersCategory(categoryName) && !customDescription) {
      return {
        success: false,
        error: "Describe de qué es el gasto cuando eliges Otros.",
      };
    }

    const expenseNotes = buildExpenseNotes(categoryName, customDescription, notes);

    const { userId } = await requireRole(supabase, organizationId, ["driver"]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("user_id", userId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!driver) {
      return { success: false, error: "No tienes perfil de conductor activo." };
    }

    const { data: expense } = await supabase
      .from("expenses")
      .select("id, trip_id, vehicle_id, driver_id, status")
      .eq("id", expenseId)
      .eq("organization_id", organizationId)
      .single();

    if (!expense || expense.driver_id !== driver.id) {
      return { success: false, error: "Gasto no válido para este conductor." };
    }

    const { data: trip } = await supabase
      .from("trips")
      .select("id, status, vehicle_id")
      .eq("id", expense.trip_id)
      .eq("organization_id", organizationId)
      .single();

    if (!trip || trip.status !== "in_progress") {
      return {
        success: false,
        error: "Solo puedes editar gastos de viajes en curso.",
      };
    }

    const { error: updateError } = await supabase
      .from("expenses")
      .update({
        category_id: categoryId,
        amount,
        notes: expenseNotes,
      })
      .eq("id", expenseId)
      .eq("organization_id", organizationId);

    if (updateError) {
      return { success: false, error: updateError.message };
    }

    if (evidence instanceof File && evidence.size > 0) {
      const MAX_EVIDENCE_BYTES = 5 * 1024 * 1024;

      if (evidence.size > MAX_EVIDENCE_BYTES) {
        return {
          success: false,
          error: `La evidencia supera el límite de ${MAX_EVIDENCE_BYTES / (1024 * 1024)} MB.`,
        };
      }

      const vehicleId = expense.vehicle_id ?? trip.vehicle_id;
      if (!vehicleId) {
        return { success: false, error: "No se pudo asociar el vehículo." };
      }

      const extension = evidence.name.split(".").pop() ?? "jpg";
      const storagePath = `${organizationId}/${vehicleId}/${expenseId}/evidence.${extension}`;

      const { error: uploadError } = await supabase.storage
        .from("expense-evidences")
        .upload(storagePath, evidence, {
          contentType: evidence.type,
          upsert: true,
        });

      if (uploadError) {
        return { success: false, error: uploadError.message };
      }

      const { data: existingEvidence } = await supabase
        .from("expense_evidences")
        .select("id")
        .eq("expense_id", expenseId)
        .maybeSingle();

      if (existingEvidence) {
        const { error: evidenceUpdateError } = await supabase
          .from("expense_evidences")
          .update({ storage_path: storagePath })
          .eq("id", existingEvidence.id);

        if (evidenceUpdateError) {
          return { success: false, error: evidenceUpdateError.message };
        }
      } else {
        const { error: evidenceInsertError } = await supabase
          .from("expense_evidences")
          .insert({
            expense_id: expenseId,
            organization_id: organizationId,
            storage_path: storagePath,
          });

        if (evidenceInsertError) {
          return { success: false, error: evidenceInsertError.message };
        }
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "expense_updated_by_driver",
      entity: "expenses",
      entityId: expenseId,
      newState: { amount, category_id: categoryId, trip_id: expense.trip_id },
    });

    revalidatePath("/driver");
    revalidatePath("/driver/history");
    revalidatePath("/app");
    if (expense.trip_id) {
      revalidatePath(`/app/trips/${expense.trip_id}`);
    }

    return { success: true, expenseId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el gasto." };
  }
}

export async function reviewExpense(
  expenseId: string,
  organizationId: string,
  decision: "approved" | "rejected"
): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
      "accountant",
    ]);

    const { data: expense } = await supabase
      .from("expenses")
      .select("id, status, amount, trip_id")
      .eq("id", expenseId)
      .eq("organization_id", organizationId)
      .single();

    if (!expense) {
      return { success: false, error: "Gasto no encontrado." };
    }

    if (expense.status !== "pending") {
      return { success: false, error: "Este gasto ya fue revisado." };
    }

    const { error } = await supabase
      .from("expenses")
      .update({
        status: decision,
        reviewed_by: userId,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", expenseId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: decision === "approved" ? "expense_approved" : "expense_rejected",
      entity: "expenses",
      entityId: expenseId,
      previousState: { status: "pending", amount: expense.amount },
      newState: { status: decision },
    });

    revalidatePath("/app");
    if (expense.trip_id) {
      revalidatePath(`/app/trips/${expense.trip_id}`);
    }

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al revisar el gasto." };
  }
}
