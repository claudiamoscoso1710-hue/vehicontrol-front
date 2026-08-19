import { getOwnerContext } from "@/lib/auth/cached-auth";
import { loadVehiclesFleetDashboard } from "@/lib/reports/load-vehicles-fleet-dashboard";
import { VehicleProfitCard } from "@/components/owner/vehicle-profit-card";
import { Card, CardBody } from "@/components/ui/card";

type Props = {
  organizationId: string;
};

export async function VehiclesFleetSection({ organizationId }: Props) {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const fleetEntries = await loadVehiclesFleetDashboard(
    ctx.supabase,
    organizationId
  );

  const sortedEntries = [...fleetEntries].sort((a, b) => {
    if (a.hasPendingPeriod !== b.hasPendingPeriod) {
      return a.hasPendingPeriod ? -1 : 1;
    }
    return b.margin - a.margin;
  });

  return (
    <section className="grid gap-4 md:grid-cols-2">
      {sortedEntries.map((vehicle, index) => (
        <VehicleProfitCard
          key={vehicle.vehicleId}
          vehicle={vehicle}
          rank={vehicle.hasPendingPeriod ? index + 1 : undefined}
        />
      ))}
      {sortedEntries.length === 0 && (
        <Card className="md:col-span-2">
          <CardBody className="py-10 text-center text-sm text-muted-foreground">
            Sin vehículos en la flota.
          </CardBody>
        </Card>
      )}
    </section>
  );
}
