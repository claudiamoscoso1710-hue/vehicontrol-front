import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export default async function SuperAdminPage() {
  const supabase = await createClient();

  const [
    { count: orgCount },
    { count: activeVehicles },
    { count: pendingVehicles },
    { data: organizations },
    { data: plan },
  ] = await Promise.all([
    supabase
      .from("organizations")
      .select("id", { count: "exact", head: true })
      .eq("status", "active"),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("commercial_status", "active"),
    supabase
      .from("vehicles")
      .select("id", { count: "exact", head: true })
      .eq("commercial_status", "pending"),
    supabase
      .from("organizations")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("price_per_vehicle").limit(1).maybeSingle(),
  ]);

  const mrr = (activeVehicles ?? 0) * Number(plan?.price_per_vehicle ?? 30000);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Panel Super Admin</h1>
        <p className="text-sm text-muted-foreground">
          Control comercial y operación de la plataforma
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Organizaciones activas", value: String(orgCount ?? 0) },
          { label: "Vehículos activos", value: String(activeVehicles ?? 0) },
          { label: "Solicitudes pendientes", value: String(pendingVehicles ?? 0) },
          { label: "MRR (camiones × tarifa)", value: formatCurrency(mrr) },
        ].map((kpi) => (
          <div key={kpi.label} className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">{kpi.label}</p>
            <p className="mt-1 text-lg font-semibold">{kpi.value}</p>
          </div>
        ))}
      </section>

      {pendingVehicles ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm">
          Hay {pendingVehicles} vehículo(s) esperando aprobación.{" "}
          <Link href="/admin/vehicles" className="font-medium text-blue-700 hover:underline">
            Revisar solicitudes →
          </Link>
        </div>
      ) : null}

      <section>
        <h2 className="mb-3 font-medium">Organizaciones</h2>
        <ul className="space-y-2">
          {(organizations ?? []).map((org) => (
            <li key={org.id} className="rounded-lg border p-4 text-sm">
              <p className="font-medium">{org.name}</p>
              <p className="text-muted-foreground">Estado: {org.status}</p>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
