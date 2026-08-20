"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { parseMoneyValue } from "@/lib/format";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
  type SalaryBasis,
} from "@/lib/settings/driver-compensation";

export type CompensationActionResult =
  | { success: true }
  | { success: false; error: string };

export async function saveDriverCompensationSettings(
  organizationId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, ["owner"]);

    const salaryBasis = String(formData.get("salaryBasis") ?? "") as SalaryBasis;
    const commissionPercent = Number(formData.get("commissionPercent"));

    if (!["before_expenses", "after_expenses"].includes(salaryBasis)) {
      return { success: false, error: "Selecciona una base de cálculo válida." };
    }

    if (
      !Number.isFinite(commissionPercent) ||
      commissionPercent < 0 ||
      commissionPercent > 100
    ) {
      return {
        success: false,
        error: "El porcentaje de comisión debe estar entre 0 y 100.",
      };
    }

    const value = {
      salary_basis: salaryBasis,
      commission_percent: commissionPercent,
    };

    const { data: existing } = await supabase
      .from("organization_settings")
      .select("organization_id")
      .eq("organization_id", organizationId)
      .eq("key", DRIVER_COMPENSATION_SETTING_KEY)
      .maybeSingle();

    const { error } = existing
      ? await supabase
          .from("organization_settings")
          .update({ value })
          .eq("organization_id", organizationId)
          .eq("key", DRIVER_COMPENSATION_SETTING_KEY)
      : await supabase.from("organization_settings").insert({
          organization_id: organizationId,
          key: DRIVER_COMPENSATION_SETTING_KEY,
          value,
        });

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_compensation_settings_updated",
      entity: "organization_settings",
      entityId: organizationId,
      newState: value,
    });

    revalidatePath("/app/settings");
    revalidatePath("/app/drivers");
    revalidatePath("/driver/account");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo guardar la configuración." };
  }
}

export async function updateDriverCommission(
  organizationId: string,
  driverId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
    ]);

    const raw = String(formData.get("commissionPercent") ?? "").trim();
    const commissionPercent =
      raw === "" ? null : Number(raw.replace(",", "."));

    if (
      commissionPercent != null &&
      (!Number.isFinite(commissionPercent) ||
        commissionPercent < 0 ||
        commissionPercent > 100)
    ) {
      return {
        success: false,
        error: "El porcentaje debe estar entre 0 y 100, o dejarse vacío.",
      };
    }

    const { error } = await supabase
      .from("drivers")
      .update({ commission_percent: commissionPercent })
      .eq("id", driverId)
      .eq("organization_id", organizationId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_commission_updated",
      entity: "drivers",
      entityId: driverId,
      newState: { commission_percent: commissionPercent },
    });

    revalidatePath("/app/drivers");
    revalidatePath("/driver/account");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo actualizar la comisión." };
  }
}

export async function createDriverAdvance(
  organizationId: string,
  formData: FormData
): Promise<CompensationActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
      "accountant",
    ]);

    const driverId = String(formData.get("driverId") ?? "");
    const amount = parseMoneyValue(formData.get("amount"));
    const tripId = String(formData.get("tripId") ?? "").trim() || null;
    const deliveredByName = String(formData.get("deliveredByName") ?? "").trim();

    if (!driverId || !Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        error: "Selecciona un conductor y un monto válido.",
      };
    }

    if (!deliveredByName) {
      return {
        success: false,
        error: "Indica quién entregó el anticipo al conductor.",
      };
    }

    const { data: driver } = await supabase
      .from("drivers")
      .select("id")
      .eq("id", driverId)
      .eq("organization_id", organizationId)
      .eq("status", "active")
      .single();

    if (!driver) {
      return { success: false, error: "Conductor no válido." };
    }

    const { data: advance, error } = await supabase
      .from("advances")
      .insert({
        organization_id: organizationId,
        driver_id: driverId,
        trip_id: tripId,
        amount,
        status: "open",
        delivered_by_name: deliveredByName,
      })
      .select("id")
      .single();

    if (error || !advance) {
      return {
        success: false,
        error: error?.message ?? "No se pudo registrar el anticipo.",
      };
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_advance_created",
      entity: "advances",
      entityId: advance.id,
      newState: {
        driver_id: driverId,
        amount,
        trip_id: tripId,
        delivered_by_name: deliveredByName,
      },
    });

    revalidatePath("/app/drivers");
    revalidatePath("/driver");
    revalidatePath("/driver/account");

    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "No se pudo registrar el anticipo." };
  }
}

export async function getDriverCompensationConfigForOrg(organizationId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("organization_settings")
    .select("value")
    .eq("organization_id", organizationId)
    .eq("key", DRIVER_COMPENSATION_SETTING_KEY)
    .maybeSingle();

  return parseDriverCompensationConfig(data?.value ?? DEFAULT_DRIVER_COMPENSATION);
}
