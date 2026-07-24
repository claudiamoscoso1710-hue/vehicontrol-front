import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { loadVehiclesFleetDashboard } from "@/lib/reports/load-vehicles-fleet-dashboard";
import { RequestVehicleForm } from "@/components/owner/request-vehicle-form";
import { VehicleProfitCard } from "@/components/owner/vehicle-profit-card";
import { PageHeader } from "@/components/ui/page-header";
import { Card, CardBody } from "@/components/ui/card";

export default async function VehiclesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const fleetEntries = await loadVehiclesFleetDashboard(
    supabase,
    org.organizationId
  );

  const sortedEntries = [...fleetEntries].sort((a, b) => {
    if (a.hasPendingPeriod !== b.hasPendingPeriod) {
      return a.hasPendingPeriod ? -1 : 1;
    }
    return b.margin - a.margin;
  });

  const canRequest = ["owner", "admin"].includes(org.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Flota"
        subtitle={`${org.organizationName} · período actual de liquidación por vehículo`}
      />

      {canRequest && <RequestVehicleForm organizationId={org.organizationId} />}

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
    </div>
  );
}
