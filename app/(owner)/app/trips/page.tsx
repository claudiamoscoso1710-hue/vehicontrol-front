import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { formatCurrency } from "@/lib/format";

export default async function TripsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const { data: trips } = await supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, started_at, drivers(full_name), vehicles(plate)"
    )
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Viajes</h1>
          <p className="text-sm text-muted-foreground">
            {org.organizationName} · Los conductores registran los viajes
          </p>
        </div>
        <div className="flex gap-3 text-sm">
          <Link href="/app" className="text-blue-600 hover:underline">
            ← Dashboard
          </Link>
        </div>
      </div>

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
    </main>
  );
}
