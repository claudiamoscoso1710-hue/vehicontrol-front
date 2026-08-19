import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import { formatPeriodRange } from "@/lib/reports/settlement-period";
import {
  calculateOwnerTripDriverSalary,
  resolveTripCommissionPercent,
} from "@/lib/reports/trip-owner-costs";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";
import type { VehicleProfitability } from "@/lib/reports/vehicle-profitability";

export type VehicleFleetEntry = VehicleProfitability & {
  assignedDriverName: string | null;
  periodRangeLabel: string | null;
  hasAssignedDriver: boolean;
  hasPendingPeriod: boolean;
};

function minIso(dates: (string | null | undefined)[]): string | null {
  const values = dates
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);
  if (values.length === 0) return null;
  return new Date(Math.min(...values)).toISOString();
}

/** Etiquetas de período por conductor en 3 queries (antes: 5 queries × N conductores). */
async function loadPeriodLabelsByDriver(
  supabase: SupabaseClient,
  organizationId: string,
  driverIds: string[]
): Promise<Map<string, string>> {
  const labels = new Map<string, string>();
  if (driverIds.length === 0) return labels;

  const [{ data: settlements }, { data: pendingTrips }, { data: pendingExpenses }, { data: pendingAdvances }] =
    await Promise.all([
      supabase
        .from("driver_settlements")
        .select("driver_id, period_end, settled_at")
        .eq("organization_id", organizationId)
        .in("driver_id", driverIds)
        .order("settled_at", { ascending: false }),
      supabase
        .from("trips")
        .select("driver_id, closed_at, created_at")
        .eq("organization_id", organizationId)
        .in("driver_id", driverIds)
        .is("settlement_id", null),
      supabase
        .from("expenses")
        .select("driver_id, created_at")
        .eq("organization_id", organizationId)
        .in("driver_id", driverIds)
        .is("settlement_id", null),
      supabase
        .from("advances")
        .select("driver_id, created_at")
        .eq("organization_id", organizationId)
        .in("driver_id", driverIds)
        .is("settlement_id", null),
    ]);

  const lastClosedEndByDriver = new Map<string, string>();
  for (const row of settlements ?? []) {
    if (!row.driver_id || lastClosedEndByDriver.has(row.driver_id)) continue;
    if (row.period_end) lastClosedEndByDriver.set(row.driver_id, row.period_end);
  }

  for (const driverId of driverIds) {
    const pendingDates = [
      ...(pendingTrips ?? [])
        .filter((row) => row.driver_id === driverId)
        .flatMap((row) => [row.closed_at, row.created_at]),
      ...(pendingExpenses ?? [])
        .filter((row) => row.driver_id === driverId)
        .map((row) => row.created_at),
      ...(pendingAdvances ?? [])
        .filter((row) => row.driver_id === driverId)
        .map((row) => row.created_at),
    ];

    const lastClosedEnd = lastClosedEndByDriver.get(driverId) ?? null;
    const inferredStart =
      minIso(pendingDates) ??
      (lastClosedEnd
        ? new Date(new Date(lastClosedEnd).getTime() + 1).toISOString()
        : new Date().toISOString());

    const hasPending = pendingDates.length > 0;
    labels.set(
      driverId,
      hasPending
        ? formatPeriodRange(inferredStart, null, true)
        : "Período actual · sin movimientos pendientes"
    );
  }

  return labels;
}

export const loadVehiclesFleetDashboard = cache(
  async function loadVehiclesFleetDashboard(
    supabase: SupabaseClient,
    organizationId: string
  ): Promise<VehicleFleetEntry[]> {
    const orgConfig = await getOrganizationSetting(
      supabase,
      organizationId,
      DRIVER_COMPENSATION_SETTING_KEY,
      parseDriverCompensationConfig,
      DEFAULT_DRIVER_COMPENSATION
    );

    const { data: vehicles } = await supabase
      .from("vehicles")
      .select(
        "id, plate, brand, operational_status, commercial_status, assigned_driver_id, drivers(full_name, commission_percent)"
      )
      .eq("organization_id", organizationId)
      .order("plate");

    const [{ data: trips }, { data: expenses }] = await Promise.all([
      supabase
        .from("trips")
        .select(
          "id, vehicle_id, driver_id, freight_value, status, drivers(commission_percent)"
        )
        .eq("organization_id", organizationId)
        .is("settlement_id", null),
      supabase
        .from("expenses")
        .select("vehicle_id, driver_id, amount, trip_id")
        .eq("organization_id", organizationId)
        .eq("status", "approved")
        .is("settlement_id", null),
    ]);

    const tripIds = (trips ?? []).map((trip) => trip.id);
    const { data: incomes } =
      tripIds.length > 0
        ? await supabase
            .from("incomes")
            .select("amount, trip_id, vehicle_id")
            .eq("organization_id", organizationId)
            .in("trip_id", tripIds)
        : { data: [] };

    const assignedDriverIds = [
      ...new Set(
        (vehicles ?? [])
          .map((vehicle) => vehicle.assigned_driver_id)
          .filter(Boolean) as string[]
      ),
    ];

    const periodLabelsByDriver = await loadPeriodLabelsByDriver(
      supabase,
      organizationId,
      assignedDriverIds
    );

    return (vehicles ?? []).map((vehicle) => {
      const driver = Array.isArray(vehicle.drivers)
        ? vehicle.drivers[0]
        : vehicle.drivers;
      const assignedDriverId = vehicle.assigned_driver_id;

      if (!assignedDriverId) {
        return {
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          brand: vehicle.brand,
          operationalStatus: vehicle.operational_status,
          commercialStatus: vehicle.commercial_status,
          tripCount: 0,
          totalIncome: 0,
          totalExpenses: 0,
          margin: 0,
          assignedDriverName: null,
          periodRangeLabel: null,
          hasAssignedDriver: false,
          hasPendingPeriod: false,
        };
      }

      const vehicleTrips = (trips ?? []).filter(
        (trip) =>
          trip.vehicle_id === vehicle.id && trip.driver_id === assignedDriverId
      );
      const vehicleTripIds = new Set(vehicleTrips.map((trip) => trip.id));

      const vehicleExpenses = (expenses ?? []).filter(
        (expense) =>
          expense.vehicle_id === vehicle.id &&
          expense.driver_id === assignedDriverId
      );

      const tripExpenseTotals = new Map<string, number>();
      for (const expense of vehicleExpenses) {
        if (!expense.trip_id) continue;
        tripExpenseTotals.set(
          expense.trip_id,
          (tripExpenseTotals.get(expense.trip_id) ?? 0) + Number(expense.amount)
        );
      }

      const commissionPercent = resolveTripCommissionPercent(
        orgConfig,
        driver?.commission_percent ?? null
      );

      const driverSalaryTotal = vehicleTrips
        .filter((trip) => trip.status === "closed")
        .reduce((sum, trip) => {
          const freightValue = Number(trip.freight_value ?? 0);
          const tripExpenseTotal = tripExpenseTotals.get(trip.id) ?? 0;
          return (
            sum +
            calculateOwnerTripDriverSalary(
              freightValue,
              tripExpenseTotal,
              commissionPercent,
              orgConfig.salary_basis
            )
          );
        }, 0);

      const expenseTotal =
        vehicleExpenses.reduce((sum, row) => sum + Number(row.amount), 0) +
        driverSalaryTotal;

      const totalIncome = (incomes ?? [])
        .filter((row) => row.trip_id && vehicleTripIds.has(row.trip_id))
        .reduce((sum, row) => sum + Number(row.amount), 0);

      const hasPendingPeriod = vehicleTrips.length > 0 || vehicleExpenses.length > 0;

      return {
        vehicleId: vehicle.id,
        plate: vehicle.plate,
        brand: vehicle.brand,
        operationalStatus: vehicle.operational_status,
        commercialStatus: vehicle.commercial_status,
        tripCount: vehicleTrips.length,
        totalIncome,
        totalExpenses: expenseTotal,
        margin: totalIncome - expenseTotal,
        assignedDriverName: driver?.full_name ?? null,
        periodRangeLabel: periodLabelsByDriver.get(assignedDriverId) ?? null,
        hasAssignedDriver: true,
        hasPendingPeriod,
      };
    });
  }
);
