import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { CURRENT_PERIOD_ID } from "@/lib/reports/settlement-period";

export type VehicleProfitability = {
  vehicleId: string;
  plate: string;
  brand: string | null;
  operationalStatus: string;
  commercialStatus: string;
  tripCount: number;
  totalIncome: number;
  totalExpenses: number;
  margin: number;
};

export const getVehicleProfitability = cache(async function getVehicleProfitability(
  supabase: SupabaseClient,
  organizationId: string,
  options?: { since?: Date; until?: Date; periodId?: string }
): Promise<VehicleProfitability[]> {
  const since = options?.since?.toISOString();
  const until = options?.until?.toISOString();
  const periodId = options?.periodId;
  const usePeriodFilter = Boolean(periodId);
  const isCurrentPeriod = !periodId || periodId === CURRENT_PERIOD_ID;
  const useDateRange = Boolean(since) && !usePeriodFilter;

  let incomesQuery = supabase
    .from("incomes")
    .select("vehicle_id, amount, trip_id")
    .eq("organization_id", organizationId)
    .not("vehicle_id", "is", null);

  let expensesQuery = supabase
    .from("expenses")
    .select("vehicle_id, amount")
    .eq("organization_id", organizationId)
    .eq("status", "approved")
    .not("vehicle_id", "is", null);

  let tripsQuery = supabase
    .from("trips")
    .select("id, vehicle_id")
    .eq("organization_id", organizationId);

  if (usePeriodFilter) {
    expensesQuery = isCurrentPeriod
      ? expensesQuery.is("settlement_id", null)
      : expensesQuery.eq("settlement_id", periodId as string);

    tripsQuery = isCurrentPeriod
      ? tripsQuery.is("settlement_id", null)
      : tripsQuery.eq("settlement_id", periodId as string);
  } else if (useDateRange) {
    incomesQuery = incomesQuery.gte("created_at", since as string);
    expensesQuery = expensesQuery.gte("created_at", since as string);
    tripsQuery = tripsQuery.gte("created_at", since as string);
    if (until) {
      incomesQuery = incomesQuery.lt("created_at", until);
      expensesQuery = expensesQuery.lt("created_at", until);
      tripsQuery = tripsQuery.lt("created_at", until);
    }
  }

  const [{ data: vehicles }, { data: expenses }, { data: trips }] =
    await Promise.all([
      supabase
        .from("vehicles")
        .select("id, plate, brand, operational_status, commercial_status")
        .eq("organization_id", organizationId)
        .order("plate"),
      expensesQuery,
      tripsQuery,
    ]);

  let incomes: {
    vehicle_id: string | null;
    amount: number;
    trip_id: string | null;
  }[];

  if (usePeriodFilter) {
    const periodTripIds = (trips ?? []).map((trip) => trip.id);
    const tripVehicleById = new Map(
      (trips ?? []).map((trip) => [trip.id, trip.vehicle_id])
    );

    const { data: periodIncomes } =
      periodTripIds.length > 0
        ? await supabase
            .from("incomes")
            .select("vehicle_id, amount, trip_id")
            .eq("organization_id", organizationId)
            .in("trip_id", periodTripIds)
        : { data: [] };

    incomes = (periodIncomes ?? []).map((row) => ({
      vehicle_id:
        row.vehicle_id ?? tripVehicleById.get(row.trip_id as string) ?? null,
      amount: row.amount,
      trip_id: row.trip_id,
    }));
  } else {
    const { data: rawIncomes } = await incomesQuery;
    incomes = rawIncomes ?? [];
  }

  const incomeByVehicle = new Map<string, number>();
  for (const row of incomes) {
    if (!row.vehicle_id) continue;
    incomeByVehicle.set(
      row.vehicle_id,
      (incomeByVehicle.get(row.vehicle_id) ?? 0) + Number(row.amount)
    );
  }

  const expenseByVehicle = new Map<string, number>();
  for (const row of expenses ?? []) {
    if (!row.vehicle_id) continue;
    expenseByVehicle.set(
      row.vehicle_id,
      (expenseByVehicle.get(row.vehicle_id) ?? 0) + Number(row.amount)
    );
  }

  const tripCountByVehicle = new Map<string, number>();
  for (const row of trips ?? []) {
    tripCountByVehicle.set(
      row.vehicle_id,
      (tripCountByVehicle.get(row.vehicle_id) ?? 0) + 1
    );
  }

  return (vehicles ?? [])
    .map((vehicle) => {
      const totalIncome = incomeByVehicle.get(vehicle.id) ?? 0;
      const totalExpenses = expenseByVehicle.get(vehicle.id) ?? 0;
      return {
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        operationalStatus: vehicle.operational_status,
        commercialStatus: vehicle.commercial_status,
        tripCount: tripCountByVehicle.get(vehicle.id) ?? 0,
        totalIncome,
        totalExpenses,
        margin: totalIncome - totalExpenses,
      };
    })
    .sort((a, b) => b.margin - a.margin);
});
