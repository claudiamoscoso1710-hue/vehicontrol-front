import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { CreateClientForm } from "@/components/owner/create-client-form";
import { formatCurrency } from "@/lib/format";

export default async function ClientsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const [{ data: clients }, { data: trips }] = await Promise.all([
    supabase
      .from("clients")
      .select("id, name, tax_id, created_at")
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("trips")
      .select("client_id, freight_value, status, freight_paid")
      .eq("organization_id", org.organizationId)
      .not("client_id", "is", null),
  ]);

  const statsByClient = new Map<
    string,
    {
      tripCount: number;
      totalFreight: number;
      pendingFreight: number;
      closedCount: number;
    }
  >();

  for (const trip of trips ?? []) {
    if (!trip.client_id) continue;
    const stats = statsByClient.get(trip.client_id) ?? {
      tripCount: 0,
      totalFreight: 0,
      pendingFreight: 0,
      closedCount: 0,
    };
    stats.tripCount += 1;
    stats.totalFreight += Number(trip.freight_value ?? 0);

    if (trip.status === "closed" && Number(trip.freight_value ?? 0) > 0) {
      stats.closedCount += 1;
      if (!trip.freight_paid) {
        stats.pendingFreight += Number(trip.freight_value ?? 0);
      }
    }

    statsByClient.set(trip.client_id, stats);
  }

  const canManage = ["owner", "admin"].includes(org.role);

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Clientes</h1>
        <p className="text-sm text-muted-foreground">
          {org.organizationName} · Toca un cliente para ver fletes, camiones y
          pagos
        </p>
      </header>

      {canManage && <CreateClientForm organizationId={org.organizationId} />}

      <section>
        <h2 className="mb-3 font-medium">Cartera de clientes</h2>
        <ul className="space-y-2">
          {(clients ?? []).map((client) => {
            const stats = statsByClient.get(client.id);
            return (
              <li key={client.id}>
                <Link
                  href={`/app/clients/${client.id}`}
                  className="flex items-center justify-between gap-4 rounded-lg border p-4 text-sm transition-colors hover:bg-muted/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium">{client.name}</p>
                    <p className="text-muted-foreground">
                      {client.tax_id ?? "Sin NIT"}
                    </p>
                    <p className="mt-1 text-muted-foreground">
                      {stats
                        ? `${stats.tripCount} viaje(s) · Fletes: ${formatCurrency(stats.totalFreight)}`
                        : "Sin viajes registrados"}
                    </p>
                    {stats && stats.pendingFreight > 0 ? (
                      <p className="mt-1 text-xs font-medium text-amber-700">
                        Por cobrar: {formatCurrency(stats.pendingFreight)}
                      </p>
                    ) : stats && stats.closedCount > 0 ? (
                      <p className="mt-1 text-xs font-medium text-emerald-700">
                        Fletes al día
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            );
          })}
          {(clients ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">Sin clientes.</li>
          )}
        </ul>
      </section>
    </main>
  );
}
