import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { formatPeriodRange } from "@/lib/reports/settlement-period";
import {
  calculateTripEarnings,
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  getEffectiveCommissionPercent,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";

export type DriverRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  commission_percent: number | null;
};

export type DriverDashboardStatement = {
  periodRangeLabel: string;
  hasPendingItems: boolean;
  totalEarnings: number;
  reimbursableExpenses: number;
  totalAdvances: number;
  netBalance: number;
  tripCount: number;
  expenseCount: number;
  advanceCount: number;
};

export type DriverDashboardEntry = {
  driver: DriverRecord;
  assignedVehicle: { id: string; plate: string } | null;
  inProgressTrips: number;
  statement: DriverDashboardStatement | null;
};

export type DriversDashboardTotals = {
  activeCount: number;
  pendingCount: number;
  totalToPay: number;
  totalToRecover: number;
};

type RpcDriverRow = {
  driverId: string;
  fullName: string;
  phone: string | null;
  status: string;
  userId: string | null;
  commissionPercent: number | null;
  assignedVehicle: { id: string; plate: string } | null;
  tripsInProgress: number;
  periodStart: string;
  tripCount: number;
  expenseCount: number;
  advanceCount: number;
  totalEarnings: number;
  totalExpenses: number;
  totalAdvances: number;
  netBalance: number;
  hasPendingItems: boolean;
};

type RpcDashboard = {
  data: RpcDriverRow[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  totals: DriversDashboardTotals;
};

function mapRow(row: RpcDriverRow): DriverDashboardEntry {
  const isActive = row.status === "active";
  return {
    driver: {
      id: row.driverId,
      full_name: row.fullName,
      phone: row.phone,
      status: row.status,
      user_id: row.userId,
      commission_percent: row.commissionPercent,
    },
    assignedVehicle: row.assignedVehicle,
    inProgressTrips: Number(row.tripsInProgress ?? 0),
    statement: isActive
      ? {
          periodRangeLabel: formatPeriodRange(
            row.periodStart ?? new Date().toISOString(),
            null,
            true
          ),
          hasPendingItems: Boolean(row.hasPendingItems),
          totalEarnings: Number(row.totalEarnings ?? 0),
          reimbursableExpenses: Number(row.totalExpenses ?? 0),
          totalAdvances: Number(row.totalAdvances ?? 0),
          netBalance: Number(row.netBalance ?? 0),
          tripCount: Number(row.tripCount ?? 0),
          expenseCount: Number(row.expenseCount ?? 0),
          advanceCount: Number(row.advanceCount ?? 0),
        }
      : null,
  };
}

function isMissingRpc(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("get_drivers_dashboard")
  );
}

export const loadDriversDashboard = cache(async function loadDriversDashboard(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  entries: DriverDashboardEntry[];
  totals: DriversDashboardTotals;
  drivers: DriverRecord[];
}> {
  const { data, error } = await supabase.rpc("get_drivers_dashboard", {
    p_organization_id: organizationId,
    p_page: 1,
    p_page_size: 100,
  });

  if (!error && data) {
    const payload = data as RpcDashboard;
    const entries = (payload.data ?? []).map(mapRow);
    return {
      entries,
      totals: payload.totals ?? {
        activeCount: 0,
        pendingCount: 0,
        totalToPay: 0,
        totalToRecover: 0,
      },
      drivers: entries.map((entry) => entry.driver),
    };
  }

  if (!isMissingRpc(error)) {
    console.error("get_drivers_dashboard failed", error?.message);
  }

  return loadDriversDashboardFallback(supabase, organizationId);
});

async function loadDriversDashboardFallback(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{
  entries: DriverDashboardEntry[];
  totals: DriversDashboardTotals;
  drivers: DriverRecord[];
}> {
  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, full_name, phone, status, user_id, commission_percent")
    .eq("organization_id", organizationId)
    .order("full_name", { ascending: true });

  const driverList = drivers ?? [];
  const driverIds = driverList.map((driver) => driver.id);

  const orgConfig = await getOrganizationSetting(
    supabase,
    organizationId,
    DRIVER_COMPENSATION_SETTING_KEY,
    parseDriverCompensationConfig,
    DEFAULT_DRIVER_COMPENSATION
  );

  const [
    { data: vehicles },
    { data: openTrips },
    { data: trips },
    { data: expenses },
    { data: advances },
  ] = await Promise.all([
    driverIds.length
      ? supabase
          .from("vehicles")
          .select("id, plate, assigned_driver_id")
          .eq("organization_id", organizationId)
          .in("assigned_driver_id", driverIds)
      : Promise.resolve({ data: [] }),
    driverIds.length
      ? supabase
          .from("trips")
          .select("driver_id")
          .eq("organization_id", organizationId)
          .eq("status", "in_progress")
          .in("driver_id", driverIds)
      : Promise.resolve({ data: [] }),
    driverIds.length
      ? supabase
          .from("trips")
          .select("id, driver_id, freight_value")
          .eq("organization_id", organizationId)
          .eq("status", "closed")
          .is("settlement_id", null)
          .in("driver_id", driverIds)
      : Promise.resolve({ data: [] }),
    driverIds.length
      ? supabase
          .from("expenses")
          .select("driver_id, trip_id, amount, additional_trip_expense")
          .eq("organization_id", organizationId)
          .eq("status", "approved")
          .is("settlement_id", null)
          .in("driver_id", driverIds)
      : Promise.resolve({ data: [] }),
    driverIds.length
      ? supabase
          .from("advances")
          .select("driver_id, amount")
          .eq("organization_id", organizationId)
          .is("settlement_id", null)
          .in("driver_id", driverIds)
      : Promise.resolve({ data: [] }),
  ]);

  const vehicleByDriver = new Map(
    (vehicles ?? []).map((vehicle) => [
      vehicle.assigned_driver_id as string,
      { id: vehicle.id, plate: vehicle.plate },
    ])
  );

  function groupSum(
    rows: { driver_id: string | null; amount?: number }[] | null
  ) {
    const map = new Map<string, { count: number; total: number }>();
    for (const row of rows ?? []) {
      if (!row.driver_id) continue;
      const current = map.get(row.driver_id) ?? { count: 0, total: 0 };
      current.count += 1;
      current.total += Number(row.amount ?? 0);
      map.set(row.driver_id, current);
    }
    return map;
  }

  const tripExpenseTotals = new Map<string, number>();
  for (const expense of expenses ?? []) {
    if (!expense.trip_id || !expense.driver_id) continue;
    if (expense.additional_trip_expense) continue;
    const key = `${expense.driver_id}:${expense.trip_id}`;
    tripExpenseTotals.set(
      key,
      (tripExpenseTotals.get(key) ?? 0) + Number(expense.amount ?? 0)
    );
  }

  const tripAgg = new Map<string, { count: number; totalEarnings: number }>();
  for (const trip of trips ?? []) {
    if (!trip.driver_id) continue;
    const commission = getEffectiveCommissionPercent(
      orgConfig,
      driverList.find((driver) => driver.id === trip.driver_id)?.commission_percent ??
        null
    );
    const tripExpenses =
      tripExpenseTotals.get(`${trip.driver_id}:${trip.id}`) ?? 0;
    const earnings = calculateTripEarnings(
      Number(trip.freight_value ?? 0),
      tripExpenses,
      commission,
      orgConfig.salary_basis
    );
    const current = tripAgg.get(trip.driver_id) ?? { count: 0, totalEarnings: 0 };
    current.count += 1;
    current.totalEarnings += earnings;
    tripAgg.set(trip.driver_id, current);
  }

  const expenseAgg = groupSum(expenses);
  const advanceAgg = groupSum(advances);
  const openTripsByDriver = new Map<string, number>();
  for (const trip of openTrips ?? []) {
    if (!trip.driver_id) continue;
    openTripsByDriver.set(
      trip.driver_id,
      (openTripsByDriver.get(trip.driver_id) ?? 0) + 1
    );
  }

  const periodLabel = formatPeriodRange(new Date().toISOString(), null, true);
  const entries = driverList.map((driver) => {
    const tripsForDriver = tripAgg.get(driver.id) ?? { count: 0, totalEarnings: 0 };
    const expensesForDriver = expenseAgg.get(driver.id) ?? { count: 0, total: 0 };
    const advancesForDriver = advanceAgg.get(driver.id) ?? { count: 0, total: 0 };
    const totalEarnings = tripsForDriver.totalEarnings;
    const netBalance =
      totalEarnings + expensesForDriver.total - advancesForDriver.total;
    const hasPendingItems =
      tripsForDriver.count + expensesForDriver.count + advancesForDriver.count > 0;

    return {
      driver,
      assignedVehicle: vehicleByDriver.get(driver.id) ?? null,
      inProgressTrips: openTripsByDriver.get(driver.id) ?? 0,
      statement:
        driver.status === "active"
          ? {
              periodRangeLabel: periodLabel,
              hasPendingItems,
              totalEarnings,
              reimbursableExpenses: expensesForDriver.total,
              totalAdvances: advancesForDriver.total,
              netBalance,
              tripCount: tripsForDriver.count,
              expenseCount: expensesForDriver.count,
              advanceCount: advancesForDriver.count,
            }
          : null,
    };
  });

  const pendingEntries = entries.filter(
    (entry) => entry.driver.status === "active" && entry.statement?.hasPendingItems
  );

  return {
    entries,
    drivers: driverList,
    totals: {
      activeCount: entries.filter((entry) => entry.driver.status === "active").length,
      pendingCount: pendingEntries.length,
      totalToPay: pendingEntries.reduce(
        (sum, entry) => sum + Math.max(0, entry.statement?.netBalance ?? 0),
        0
      ),
      totalToRecover: pendingEntries.reduce(
        (sum, entry) =>
          sum + Math.abs(Math.min(0, entry.statement?.netBalance ?? 0)),
        0
      ),
    },
  };
}
