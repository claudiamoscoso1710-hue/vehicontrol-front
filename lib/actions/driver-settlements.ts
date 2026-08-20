"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit/log";
import { buildDriverAccountStatement } from "@/lib/reports/driver-account-statement";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";
import { createClient } from "@/lib/supabase/server";

export type SettlementActionResult =
  | { success: true; settlementId: string }
  | { success: false; error: string };

export async function createDriverSettlement(
  organizationId: string,
  driverId: string,
  notes?: string
): Promise<SettlementActionResult> {
  try {
    const supabase = await createClient();
    const { userId } = await requireRole(supabase, organizationId, [
      "owner",
      "admin",
      "accountant",
    ]);

    const { data: driver } = await supabase
      .from("drivers")
      .select("id, commission_percent")
      .eq("id", driverId)
      .eq("organization_id", organizationId)
      .single();

    if (!driver) {
      return { success: false, error: "Conductor no encontrado." };
    }

    const orgConfig = await getOrganizationSetting(
      supabase,
      organizationId,
      DRIVER_COMPENSATION_SETTING_KEY,
      parseDriverCompensationConfig,
      DEFAULT_DRIVER_COMPENSATION
    );

    const { data: trips } = await supabase
      .from("trips")
      .select("id, origin, destination, closed_at, freight_value, client_id")
      .eq("organization_id", organizationId)
      .eq("driver_id", driverId)
      .eq("status", "closed")
      .is("settlement_id", null);

    const tripIds = (trips ?? []).map((trip) => trip.id);

    const { data: tripExpenses } =
      tripIds.length > 0
        ? await supabase
            .from("expenses")
            .select("trip_id, amount")
            .eq("organization_id", organizationId)
            .eq("driver_id", driverId)
            .eq("status", "approved")
            .is("settlement_id", null)
            .in("trip_id", tripIds)
        : { data: [] };

    const { data: driverExpenses } = await supabase
      .from("expenses")
      .select(
        "id, amount, notes, created_at, trip_id, expense_categories(name), trips(origin, destination), vehicles(plate)"
      )
      .eq("organization_id", organizationId)
      .eq("driver_id", driverId)
      .eq("status", "approved")
      .is("settlement_id", null);

    const { data: advances } = await supabase
      .from("advances")
      .select("id, amount, status, created_at, trip_id")
      .eq("organization_id", organizationId)
      .eq("driver_id", driverId)
      .is("settlement_id", null);

    const expenseIdsForEvidence = (driverExpenses ?? []).map((expense) => expense.id);
    const { data: settlementEvidences } =
      expenseIdsForEvidence.length > 0
        ? await supabase
            .from("expense_evidences")
            .select("expense_id")
            .in("expense_id", expenseIdsForEvidence)
        : { data: [] };
    const settlementEvidenceSet = new Set(
      (settlementEvidences ?? []).map((row) => row.expense_id)
    );

    const mappedExpenses = (driverExpenses ?? []).map((expense) => {
      const category = Array.isArray(expense.expense_categories)
        ? expense.expense_categories[0]
        : expense.expense_categories;
      const trip = Array.isArray(expense.trips) ? expense.trips[0] : expense.trips;
      const vehicle = Array.isArray(expense.vehicles)
        ? expense.vehicles[0]
        : expense.vehicles;

      return {
        id: expense.id,
        amount: expense.amount,
        created_at: expense.created_at,
        notes: expense.notes,
        trip_id: expense.trip_id,
        category_name: (category as { name: string } | null)?.name ?? "Gasto",
        trip_origin: (trip as { origin: string } | null)?.origin ?? null,
        trip_destination: (trip as { destination: string } | null)?.destination ?? null,
        vehicle_plate: (vehicle as { plate: string } | null)?.plate ?? null,
        has_evidence: settlementEvidenceSet.has(expense.id),
      };
    });

    const preview = buildDriverAccountStatement({
      periodId: "current",
      isCurrentPeriod: true,
      periodStart: new Date().toISOString(),
      periodEnd: null,
      periodRangeLabel: "Pendiente de liquidar",
      periodOptions: [],
      periodLabel: "Pendiente de liquidar",
      orgConfig,
      driverCommissionPercent: driver.commission_percent,
      trips: trips ?? [],
      tripExpenses: tripExpenses ?? [],
      driverExpenses: mappedExpenses,
      advances: advances ?? [],
    });

    if (!preview.hasPendingItems) {
      return {
        success: false,
        error: "No hay movimientos pendientes de liquidar para este conductor.",
      };
    }

    const dates: number[] = [];
    for (const trip of trips ?? []) {
      if (trip.closed_at) dates.push(new Date(trip.closed_at).getTime());
    }
    for (const expense of mappedExpenses) {
      dates.push(new Date(expense.created_at).getTime());
    }
    for (const advance of advances ?? []) {
      dates.push(new Date(advance.created_at).getTime());
    }

    const periodStart = new Date(Math.min(...dates)).toISOString();
    const periodEnd = new Date(Math.max(...dates)).toISOString();

    const reimbursableExpenses = preview.totalExpenses;

    const { data: settlement, error: insertError } = await supabase
      .from("driver_settlements")
      .insert({
        organization_id: organizationId,
        driver_id: driverId,
        period_start: periodStart,
        period_end: periodEnd,
        total_earnings: preview.totalEarnings,
        total_expenses: reimbursableExpenses,
        total_advances: preview.totalAdvances,
        net_balance: preview.netBalance,
        payment_amount: preview.netBalance,
        notes: notes?.trim() || null,
        settled_by: userId,
      })
      .select("id")
      .single();

    if (insertError || !settlement) {
      return {
        success: false,
        error: insertError?.message ?? "No se pudo crear la liquidación.",
      };
    }

    const settlementId = settlement.id;

    if (tripIds.length > 0) {
      const { error } = await supabase
        .from("trips")
        .update({ settlement_id: settlementId })
        .in("id", tripIds);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    const expenseIds = mappedExpenses.map((expense) => expense.id);
    const tripExpenseCount = mappedExpenses.filter((expense) => expense.trip_id).length;
    const vehicleExpenseCount = mappedExpenses.filter(
      (expense) => !expense.trip_id
    ).length;
    if (expenseIds.length > 0) {
      const { error } = await supabase
        .from("expenses")
        .update({ settlement_id: settlementId })
        .in("id", expenseIds);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    const advanceIds = (advances ?? []).map((advance) => advance.id);
    if (advanceIds.length > 0) {
      const { error } = await supabase
        .from("advances")
        .update({ settlement_id: settlementId, status: "settled" })
        .in("id", advanceIds);

      if (error) {
        return { success: false, error: error.message };
      }
    }

    await writeAuditLog(supabase, {
      organizationId,
      userId,
      action: "driver_settlement_created",
      entity: "driver_settlements",
      entityId: settlementId,
      newState: {
        driver_id: driverId,
        net_balance: preview.netBalance,
        trip_count: tripIds.length,
        expense_count: expenseIds.length,
        trip_expense_count: tripExpenseCount,
        vehicle_expense_count: vehicleExpenseCount,
        owner_assumed_expenses: preview.ownerAssumedExpenses,
        advance_count: advanceIds.length,
        freight_held: preview.totalFreightHeld,
      },
    });

    revalidatePath(`/app/drivers/${driverId}/account`);
    revalidatePath("/driver/account");
    revalidatePath("/app/expenses");
    revalidatePath("/app/vehicles");

    return { success: true, settlementId };
  } catch (error) {
    if (error instanceof RoleError) {
      return { success: false, error: "No tienes permisos para liquidar." };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error inesperado.",
    };
  }
}
