import type { SupabaseClient } from "@supabase/supabase-js";
import {
  formatPeriodRange,
  resolveDriverPeriodContext,
} from "@/lib/reports/settlement-period";
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

export async function loadVehiclesFleetDashboard(
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

  const periodByDriver = new Map<
    string,
    Awaited<ReturnType<typeof resolveDriverPeriodContext>>
  >();

  await Promise.all(
    assignedDriverIds.map(async (driverId) => {
      const context = await resolveDriverPeriodContext(
        supabase,
        organizationId,
        driverId
      );
      periodByDriver.set(driverId, context);
    })
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
            commissionPercent
          )
        );
      }, 0);

    const expenseTotal =
      vehicleExpenses.reduce((sum, row) => sum + Number(row.amount), 0) +
      driverSalaryTotal;

    const totalIncome = (incomes ?? [])
      .filter(
        (row) => row.trip_id && vehicleTripIds.has(row.trip_id)
      )
      .reduce((sum, row) => sum + Number(row.amount), 0);

    const periodContext = periodByDriver.get(assignedDriverId);
    const periodRangeLabel = periodContext
      ? formatPeriodRange(
          periodContext.periodStart,
          periodContext.periodEnd,
          periodContext.isCurrent
        )
      : null;

    const hasPendingPeriod =
      vehicleTrips.length > 0 || vehicleExpenses.length > 0;

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
      periodRangeLabel,
      hasAssignedDriver: true,
      hasPendingPeriod,
    };
  });
}
