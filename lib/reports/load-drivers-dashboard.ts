import type { SupabaseClient } from "@supabase/supabase-js";
import type { DriverAccountStatement } from "@/lib/reports/driver-account-statement";
import { loadDriverAccountStatement } from "@/lib/reports/load-driver-account-statement";

export type DriverRecord = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  commission_percent: number | null;
};

export type DriverDashboardEntry = {
  driver: DriverRecord;
  assignedVehicle: { id: string; plate: string } | null;
  inProgressTrips: number;
  statement: DriverAccountStatement | null;
};

export type DriversDashboardTotals = {
  activeCount: number;
  pendingCount: number;
  totalToPay: number;
  totalToRecover: number;
};

export async function loadDriversDashboard(
  supabase: SupabaseClient,
  organizationId: string,
  drivers: DriverRecord[]
): Promise<{
  entries: DriverDashboardEntry[];
  totals: DriversDashboardTotals;
}> {
  const driverIds = drivers.map((driver) => driver.id);

  const [{ data: vehicles }, { data: openTrips }] = await Promise.all([
    driverIds.length > 0
      ? supabase
          .from("vehicles")
          .select("id, plate, assigned_driver_id")
          .eq("organization_id", organizationId)
          .in("assigned_driver_id", driverIds)
      : Promise.resolve({ data: [] }),
    driverIds.length > 0
      ? supabase
          .from("trips")
          .select("driver_id")
          .eq("organization_id", organizationId)
          .eq("status", "in_progress")
          .in("driver_id", driverIds)
      : Promise.resolve({ data: [] }),
  ]);

  const vehicleByDriver = new Map(
    (vehicles ?? []).map((vehicle) => [
      vehicle.assigned_driver_id as string,
      { id: vehicle.id, plate: vehicle.plate },
    ])
  );

  const openTripsByDriver = new Map<string, number>();
  for (const trip of openTrips ?? []) {
    if (!trip.driver_id) continue;
    openTripsByDriver.set(
      trip.driver_id,
      (openTripsByDriver.get(trip.driver_id) ?? 0) + 1
    );
  }

  const entries = await Promise.all(
    drivers.map(async (driver) => {
      const statement =
        driver.status === "active"
          ? await loadDriverAccountStatement(
              supabase,
              organizationId,
              driver.id
            )
          : null;

      return {
        driver,
        assignedVehicle: vehicleByDriver.get(driver.id) ?? null,
        inProgressTrips: openTripsByDriver.get(driver.id) ?? 0,
        statement,
      };
    })
  );

  const activeEntries = entries.filter(
    (entry) => entry.driver.status === "active" && entry.statement
  );

  const pendingEntries = activeEntries.filter(
    (entry) => entry.statement?.hasPendingItems
  );

  const totals: DriversDashboardTotals = {
    activeCount: activeEntries.length,
    pendingCount: pendingEntries.length,
    totalToPay: pendingEntries.reduce(
      (sum, entry) =>
        sum +
        Math.max(0, entry.statement?.netBalance ?? 0),
      0
    ),
    totalToRecover: pendingEntries.reduce(
      (sum, entry) =>
        sum +
        Math.abs(Math.min(0, entry.statement?.netBalance ?? 0)),
      0
    ),
  };

  return { entries, totals };
}
