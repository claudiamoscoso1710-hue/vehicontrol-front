import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { formatSettlementPeriod } from "@/lib/reports/driver-account-statement";
import {
  CURRENT_PERIOD_ID,
  formatPeriodRange,
  loadDriverSettlementPeriods,
} from "@/lib/reports/settlement-period";

export type ExpensePeriodListItem = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  owner_prepaid: boolean;
  additional_trip_expense: boolean;
  category_id: string | null;
  vehicle_id: string | null;
  created_at: string;
  trip_id: string | null;
  settlement_id: string | null;
  tripLabel: string | null;
  vehiclePlate: string | null;
  driverName: string | null;
  categoryName: string;
  hasEvidence: boolean;
};

export type ExpensePeriodGroup = {
  id: string;
  title: string;
  rangeLabel: string;
  isCurrent: boolean;
  expenses: ExpensePeriodListItem[];
  total: number;
};

type RawExpense = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  owner_prepaid?: boolean | null;
  additional_trip_expense?: boolean | null;
  category_id?: string | null;
  vehicle_id?: string | null;
  created_at: string;
  trip_id: string | null;
  settlement_id: string | null;
  expense_categories: { name: string } | { name: string }[] | null;
  drivers: { full_name: string } | { full_name: string }[] | null;
  trips:
    | { origin: string; destination: string }
    | { origin: string; destination: string }[]
    | null;
  vehicles: { plate: string } | { plate: string }[] | null;
};

function mapExpenseRow(
  expense: RawExpense,
  evidenceSet: Set<string>
): ExpensePeriodListItem {
  const category = Array.isArray(expense.expense_categories)
    ? expense.expense_categories[0]
    : expense.expense_categories;
  const driver = Array.isArray(expense.drivers)
    ? expense.drivers[0]
    : expense.drivers;
  const trip = Array.isArray(expense.trips) ? expense.trips[0] : expense.trips;
  const vehicle = Array.isArray(expense.vehicles)
    ? expense.vehicles[0]
    : expense.vehicles;

  return {
    id: expense.id,
    amount: Number(expense.amount),
    status: expense.status,
    notes: expense.notes,
    owner_prepaid: Boolean(expense.owner_prepaid),
    additional_trip_expense: Boolean(expense.additional_trip_expense),
    category_id: expense.category_id ?? null,
    vehicle_id: expense.vehicle_id ?? null,
    created_at: expense.created_at,
    trip_id: expense.trip_id,
    settlement_id: expense.settlement_id,
    tripLabel:
      trip?.origin && trip?.destination
        ? `${trip.origin} → ${trip.destination}`
        : null,
    vehiclePlate: vehicle?.plate ?? null,
    driverName: driver?.full_name ?? null,
    categoryName: category?.name ?? "Sin categoría",
    hasEvidence: evidenceSet.has(expense.id),
  };
}

function sumExpenses(expenses: ExpensePeriodListItem[]): number {
  return expenses.reduce((sum, row) => sum + row.amount, 0);
}

function buildGroups(
  expenses: ExpensePeriodListItem[],
  settlements: {
    id: string;
    period_start: string;
    period_end: string;
    settled_at: string;
    driverLabel?: string;
  }[],
  currentRangeLabel: string
): ExpensePeriodGroup[] {
  const currentExpenses = expenses.filter((expense) => !expense.settlement_id);
  const groups: ExpensePeriodGroup[] = [
    {
      id: CURRENT_PERIOD_ID,
      title: "Período vigente",
      rangeLabel: currentRangeLabel,
      isCurrent: true,
      expenses: currentExpenses,
      total: sumExpenses(currentExpenses),
    },
  ];

  for (const [index, settlement] of settlements.entries()) {
    const settlementExpenses = expenses.filter(
      (expense) => expense.settlement_id === settlement.id
    );

    if (settlementExpenses.length === 0) continue;

    const periodNumber = settlements.length - index;
    const driverPrefix = settlement.driverLabel
      ? `${settlement.driverLabel} · `
      : "";

    groups.push({
      id: settlement.id,
      title: `${driverPrefix}Período ${periodNumber} liquidado`,
      rangeLabel: formatSettlementPeriod(
        settlement.period_start,
        settlement.period_end
      ),
      isCurrent: false,
      expenses: settlementExpenses,
      total: sumExpenses(settlementExpenses),
    });
  }

  return groups;
}

export const loadOrganizationExpensesByPeriod = cache(
  async function loadOrganizationExpensesByPeriod(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ExpensePeriodGroup[]> {
  const [{ data: rawExpenses }, { data: settlements }] = await Promise.all([
    supabase
      .from("expenses")
      .select(
        "id, amount, status, notes, owner_prepaid, additional_trip_expense, category_id, vehicle_id, created_at, trip_id, settlement_id, expense_categories(name), drivers(full_name), trips(origin, destination), vehicles(plate)"
      )
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .order("created_at", { ascending: false }),
    supabase
      .from("driver_settlements")
      .select("id, period_start, period_end, settled_at, drivers(full_name)")
      .eq("organization_id", organizationId)
      .order("settled_at", { ascending: false }),
  ]);

  const expenseIds = (rawExpenses ?? []).map((expense) => expense.id);
  const { data: evidences } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", expenseIds)
      : { data: [] };

  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));
  const expenses = (rawExpenses ?? []).map((expense) =>
    mapExpenseRow(expense as RawExpense, evidenceSet)
  );

  const settlementRows = (settlements ?? []).map((row) => {
    const driver = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers;
    return {
      id: row.id,
      period_start: row.period_start,
      period_end: row.period_end,
      settled_at: row.settled_at,
      driverLabel: driver?.full_name ?? undefined,
    };
  });

  const currentRangeLabel =
    "Pendientes de liquidar · cada conductor tiene su propio período (no es mes calendario)";

  return buildGroups(expenses, settlementRows, currentRangeLabel);
});

export const loadDriverExpensesByPeriod = cache(
  async function loadDriverExpensesByPeriod(
  supabase: SupabaseClient,
  organizationId: string,
  driverId: string,
  options?: { vehicleOnly?: boolean }
): Promise<ExpensePeriodGroup[]> {
  const periodOptions = await loadDriverSettlementPeriods(
    supabase,
    organizationId,
    driverId
  );
  const currentOption =
    periodOptions.find((option) => option.isCurrent) ?? periodOptions[0];

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, amount, status, notes, owner_prepaid, additional_trip_expense, category_id, created_at, trip_id, settlement_id, expense_categories(name), drivers(full_name), trips(origin, destination), vehicles(plate)"
    )
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .eq("status", "approved")
    .order("created_at", { ascending: false });

  if (options?.vehicleOnly) {
    expensesQuery = expensesQuery.is("trip_id", null);
  }

  const [{ data: rawExpenses }, { data: settlements }] = await Promise.all([
    expensesQuery,
    supabase
      .from("driver_settlements")
      .select("id, period_start, period_end, settled_at")
      .eq("organization_id", organizationId)
      .eq("driver_id", driverId)
      .order("settled_at", { ascending: false }),
  ]);

  const expenseIds = (rawExpenses ?? []).map((expense) => expense.id);
  const { data: evidences } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", expenseIds)
      : { data: [] };

  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));
  const expenses = (rawExpenses ?? []).map((expense) =>
    mapExpenseRow(expense as RawExpense, evidenceSet)
  );

  const currentRangeLabel = formatPeriodRange(
    currentOption.periodStart,
    currentOption.periodEnd,
    true
  );

  return buildGroups(
    expenses,
    (settlements ?? []).map((row) => ({
      id: row.id,
      period_start: row.period_start,
      period_end: row.period_end,
      settled_at: row.settled_at,
    })),
    currentRangeLabel
  );
});

export function getCurrentExpensePeriodGroup(
  groups: ExpensePeriodGroup[]
): ExpensePeriodGroup | undefined {
  return groups.find((group) => group.isCurrent);
}

export function getHistoricalExpensePeriodGroups(
  groups: ExpensePeriodGroup[]
): ExpensePeriodGroup[] {
  return groups.filter((group) => !group.isCurrent);
}
