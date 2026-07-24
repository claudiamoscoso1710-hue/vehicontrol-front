import type { SupabaseClient } from "@supabase/supabase-js";
import { buildDriverAccountStatement } from "@/lib/reports/driver-account-statement";
import {
  CURRENT_PERIOD_ID,
  formatPeriodRange,
  resolveDriverPeriodContext,
} from "@/lib/reports/settlement-period";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";

export async function loadDriverAccountStatement(
  supabase: SupabaseClient,
  organizationId: string,
  driverId: string,
  periodParam?: string | null
) {
  const periodContext = await resolveDriverPeriodContext(
    supabase,
    organizationId,
    driverId,
    periodParam
  );

  const orgConfig = await getOrganizationSetting(
    supabase,
    organizationId,
    DRIVER_COMPENSATION_SETTING_KEY,
    parseDriverCompensationConfig,
    DEFAULT_DRIVER_COMPENSATION
  );

  const { data: driver } = await supabase
    .from("drivers")
    .select("commission_percent")
    .eq("id", driverId)
    .eq("organization_id", organizationId)
    .single();

  const isCurrent = periodContext.periodId === CURRENT_PERIOD_ID;

  let tripsQuery = supabase
    .from("trips")
    .select("id, origin, destination, closed_at, freight_value")
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .eq("status", "closed");

  tripsQuery = isCurrent
    ? tripsQuery.is("settlement_id", null)
    : tripsQuery.eq("settlement_id", periodContext.periodId);

  const { data: trips } = await tripsQuery.order("closed_at", { ascending: false });

  const tripIds = (trips ?? []).map((trip) => trip.id);

  let tripExpensesQuery = supabase
    .from("expenses")
    .select("trip_id, amount")
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .eq("status", "approved");

  tripExpensesQuery = isCurrent
    ? tripExpensesQuery.is("settlement_id", null)
    : tripExpensesQuery.eq("settlement_id", periodContext.periodId);

  const { data: tripExpenses } =
    tripIds.length > 0
      ? await tripExpensesQuery.in("trip_id", tripIds)
      : { data: [] };

  let driverExpensesQuery = supabase
    .from("expenses")
    .select(
      "id, amount, notes, created_at, trip_id, expense_categories(name), trips(origin, destination), vehicles(plate)"
    )
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .eq("status", "approved");

  driverExpensesQuery = isCurrent
    ? driverExpensesQuery.is("settlement_id", null)
    : driverExpensesQuery.eq("settlement_id", periodContext.periodId);

  const { data: driverExpenses } = await driverExpensesQuery.order("created_at", {
    ascending: false,
  });

  let advancesQuery = supabase
    .from("advances")
    .select("id, amount, status, created_at, trip_id, delivered_by_name")
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId);

  advancesQuery = isCurrent
    ? advancesQuery.is("settlement_id", null)
    : advancesQuery.eq("settlement_id", periodContext.periodId);

  const { data: advances } = await advancesQuery.order("created_at", {
    ascending: false,
  });

  const { data: settlements } = await supabase
    .from("driver_settlements")
    .select(
      "id, period_start, period_end, total_earnings, total_expenses, total_advances, net_balance, payment_amount, settled_at"
    )
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .order("settled_at", { ascending: false })
    .limit(12);

  const settlementTripCounts = await Promise.all(
    (settlements ?? []).map(async (settlement) => {
      const [{ count: tripCount }, { count: tripExpenseCount }, { count: vehicleExpenseCount }] =
        await Promise.all([
          supabase
            .from("trips")
            .select("id", { count: "exact", head: true })
            .eq("settlement_id", settlement.id),
          supabase
            .from("expenses")
            .select("id", { count: "exact", head: true })
            .eq("settlement_id", settlement.id)
            .not("trip_id", "is", null),
          supabase
            .from("expenses")
            .select("id", { count: "exact", head: true })
            .eq("settlement_id", settlement.id)
            .is("trip_id", null),
        ]);

      return {
        id: settlement.id,
        tripCount: tripCount ?? 0,
        tripExpenseCount: tripExpenseCount ?? 0,
        vehicleExpenseCount: vehicleExpenseCount ?? 0,
      };
    })
  );

  const settlementStatsById = new Map(
    settlementTripCounts.map((row) => [row.id, row])
  );

  const expenseIds = (driverExpenses ?? []).map((expense) => expense.id);

  const { data: evidences } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", expenseIds)
      : { data: [] };

  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));

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
      has_evidence: evidenceSet.has(expense.id),
    };
  });

  const periodRangeLabel = formatPeriodRange(
    periodContext.periodStart,
    periodContext.periodEnd,
    periodContext.isCurrent
  );

  const periodLabel = periodContext.isCurrent
    ? "Período actual"
    : periodRangeLabel;

  return buildDriverAccountStatement({
    periodId: periodContext.periodId,
    isCurrentPeriod: periodContext.isCurrent,
    periodStart: periodContext.periodStart,
    periodEnd: periodContext.periodEnd,
    periodRangeLabel,
    periodOptions: periodContext.options,
    periodLabel,
    orgConfig,
    driverCommissionPercent: driver?.commission_percent ?? null,
    trips: trips ?? [],
    tripExpenses: tripExpenses ?? [],
    driverExpenses: mappedExpenses,
    advances: advances ?? [],
    settlements: (settlements ?? []).map((row) => {
      const stats = settlementStatsById.get(row.id);
      return {
        ...row,
        trip_count: stats?.tripCount ?? 0,
        trip_expense_count: stats?.tripExpenseCount ?? 0,
        vehicle_expense_count: stats?.vehicleExpenseCount ?? 0,
      };
    }),
  });
}
