import { createClient } from "@/lib/supabase/server";
import { CreateOrganizationForm } from "@/components/admin/create-organization-form";
import { OrganizationStatusActions } from "@/components/admin/organization-status-actions";
import { formatCurrency } from "@/lib/format";

export default async function AdminOrganizationsPage() {
  const supabase = await createClient();

  const [{ data: organizations }, { data: plan }] = await Promise.all([
    supabase
      .from("organizations")
      .select("id, name, status, created_at")
      .order("created_at", { ascending: false }),
    supabase.from("plans").select("price_per_vehicle").limit(1).maybeSingle(),
  ]);

  const orgIds = (organizations ?? []).map((o) => o.id);

  const [{ data: vehicleCounts }, { data: memberCounts }] = await Promise.all([
    orgIds.length
      ? supabase
          .from("vehicles")
          .select("organization_id")
          .in("organization_id", orgIds)
          .eq("commercial_status", "active")
      : { data: [] },
    orgIds.length
      ? supabase
          .from("organization_members")
          .select("organization_id")
          .in("organization_id", orgIds)
          .eq("status", "active")
      : { data: [] },
  ]);

  const activeVehiclesByOrg = (vehicleCounts ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const membersByOrg = (memberCounts ?? []).reduce<Record<string, number>>(
    (acc, row) => {
      acc[row.organization_id] = (acc[row.organization_id] ?? 0) + 1;
      return acc;
    },
    {}
  );

  const pricePerVehicle = Number(plan?.price_per_vehicle ?? 30000);

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Organizaciones</h1>
        <p className="text-sm text-muted-foreground">
          Clientes de la plataforma y su estado comercial
        </p>
      </header>

      <CreateOrganizationForm />

      <section>
        <h2 className="mb-3 font-medium">Todas las organizaciones</h2>
        <ul className="space-y-3">
          {(organizations ?? []).map((org) => {
            const vehicles = activeVehiclesByOrg[org.id] ?? 0;
            const members = membersByOrg[org.id] ?? 0;
            const mrr = vehicles * pricePerVehicle;

            return (
              <li key={org.id} className="rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{org.name}</p>
                    <p className="text-muted-foreground">
                      {vehicles} vehículo(s) activo(s) · {members} usuario(s) · MRR{" "}
                      {formatCurrency(mrr)}
                    </p>
                    <p className="mt-1">
                      Estado:{" "}
                      <strong
                        className={
                          org.status === "active"
                            ? "text-green-700"
                            : org.status === "suspended"
                              ? "text-amber-700"
                              : "text-red-600"
                        }
                      >
                        {org.status}
                      </strong>
                    </p>
                  </div>
                  <OrganizationStatusActions
                    organizationId={org.id}
                    currentStatus={org.status}
                  />
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </main>
  );
}
