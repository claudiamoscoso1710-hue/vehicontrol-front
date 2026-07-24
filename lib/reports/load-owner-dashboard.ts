import type { SupabaseClient } from "@supabase/supabase-js";
import {
  resolveDashboardMonthContext,
  type DashboardMonthContext,
} from "@/lib/reports/dashboard-month";
import {
  getVehicleProfitability,
  type VehicleProfitability,
} from "@/lib/reports/vehicle-profitability";

export type OwnerDashboardMetrics = {
  monthContext: DashboardMonthContext;
  totalIncome: number;
  totalExpenses: number;
  vehicleExpenses: number;
  tripExpenses: number;
  margin: number;
  marginPct: number;
  openTrips: number;
  monthTripCount: number;
  settlementsInMonth: number;
  totalSettledNet: number;
  vehicleProfitability: VehicleProfitability[];
  recentTrips: {
    id: string;
    origin: string | null;
    destination: string | null;
    status: string;
    freight_value: number | null;
    created_at: string;
    vehicles: { plate: string } | { plate: string }[] | null;
  }[];
};

export async function loadOwnerDashboardMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  monthParam?: string | null
): Promise<OwnerDashboardMetrics> {
  const monthContext = resolveDashboardMonthContext(monthParam);
  const { start, end } = monthContext;

  const [
    { count: openTrips },
    { count: monthTripCount },
    { data: expenses },
    { data: incomes },
    { data: recentTrips },
    { data: settlements },
  ] = await Promise.all([
    monthContext.isCurrentMonth
      ? supabase
          .from("trips")
          .select("id", { count: "exact", head: true })
          .eq("organization_id", organizationId)
          .eq("status", "in_progress")
      : Promise.resolve({ count: 0 }),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("expenses")
      .select("amount, trip_id")
      .eq("organization_id", organizationId)
      .eq("status", "approved")
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("incomes")
      .select("amount")
      .eq("organization_id", organizationId)
      .gte("created_at", start)
      .lt("created_at", end),
    supabase
      .from("trips")
      .select("id, origin, destination, status, freight_value, created_at, vehicles(plate)")
      .eq("organization_id", organizationId)
      .gte("created_at", start)
      .lt("created_at", end)
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("driver_settlements")
      .select("net_balance")
      .eq("organization_id", organizationId)
      .gte("settled_at", start)
      .lt("settled_at", end),
  ]);

  const totalIncome =
    incomes?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const totalExpenses =
    expenses?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const vehicleExpenses =
    expenses
      ?.filter((row) => !row.trip_id)
      .reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const tripExpenses = totalExpenses - vehicleExpenses;
  const margin = totalIncome - totalExpenses;
  const marginPct =
    totalIncome > 0 ? Math.round((margin / totalIncome) * 100) : 0;

  const totalSettledNet =
    settlements?.reduce((sum, row) => sum + Number(row.net_balance), 0) ?? 0;

  const vehicleProfitability = await getVehicleProfitability(
    supabase,
    organizationId,
    {
      since: new Date(start),
      until: new Date(end),
    }
  );

  return {
    monthContext,
    totalIncome,
    totalExpenses,
    vehicleExpenses,
    tripExpenses,
    margin,
    marginPct,
    openTrips: openTrips ?? 0,
    monthTripCount: monthTripCount ?? 0,
    settlementsInMonth: settlements?.length ?? 0,
    totalSettledNet,
    vehicleProfitability,
    recentTrips: recentTrips ?? [],
  };
}
