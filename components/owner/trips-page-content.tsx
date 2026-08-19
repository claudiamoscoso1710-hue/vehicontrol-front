import Link from "next/link";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";

export async function TripsPageContent() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org } = ctx;

  const { data: trips } = await supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, started_at, drivers(full_name), vehicles(plate)"
    )
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Viajes"
        subtitle={`${org.organizationName} · Los conductores registran los viajes`}
      />

      <ul className="space-y-3">
        {(trips ?? []).map((trip) => {
          const driver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
          const vehicle = Array.isArray(trip.vehicles) ? trip.vehicles[0] : trip.vehicles;

          return (
            <li key={trip.id}>
              <Link
                href={`/app/trips/${trip.id}`}
                className="block rounded-lg border p-4 hover:bg-muted/50"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {vehicle?.plate ?? "Sin vehículo"} ·{" "}
                      {driver?.full_name ?? "Sin conductor"}
                    </p>
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-medium">{trip.status}</p>
                    <p className="text-muted-foreground">
                      {formatCurrency(Number(trip.freight_value ?? 0))}
                    </p>
                  </div>
                </div>
              </Link>
            </li>
          );
        })}
        {(trips ?? []).length === 0 && (
          <li className="text-sm text-muted-foreground">No hay viajes.</li>
        )}
      </ul>
    </div>
  );
}
