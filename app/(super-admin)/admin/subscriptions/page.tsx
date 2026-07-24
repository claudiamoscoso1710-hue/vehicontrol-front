import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { formatCurrency } from "@/lib/format";

export default async function AdminSubscriptionsPage() {
  const supabase = await createClient();

  const [{ data: plans }, { data: subscriptions }] = await Promise.all([
    supabase.from("plans").select("id, name, price_per_vehicle"),
    supabase
      .from("subscriptions")
      .select(
        "id, status, created_at, organizations(id, name), plans(name, price_per_vehicle)"
      )
      .order("created_at", { ascending: false }),
  ]);

  const subscriptionIds = (subscriptions ?? []).map((s) => s.id);

  const { data: subscriptionVehicles } = subscriptionIds.length
    ? await supabase
        .from("subscription_vehicles")
        .select("subscription_id, vehicle_id, ended_at")
        .in("subscription_id", subscriptionIds)
    : { data: [] };

  const activeVehiclesBySub = (subscriptionVehicles ?? []).reduce<
    Record<string, number>
  >((acc, row) => {
    if (!row.ended_at) {
      acc[row.subscription_id] = (acc[row.subscription_id] ?? 0) + 1;
    }
    return acc;
  }, {});

  return (
    <main className="mx-auto max-w-4xl space-y-8 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Suscripciones</h1>
        <p className="text-sm text-muted-foreground">
          Planes y facturación por vehículo activo
        </p>
      </header>

      <section className="rounded-lg border p-4">
        <h2 className="mb-3 font-medium">Planes disponibles</h2>
        <ul className="space-y-2 text-sm">
          {(plans ?? []).map((plan) => (
            <li key={plan.id} className="flex justify-between">
              <span>{plan.name}</span>
              <span className="font-medium">
                {formatCurrency(Number(plan.price_per_vehicle))}/vehículo/mes
              </span>
            </li>
          ))}
          {(plans ?? []).length === 0 && (
            <li className="text-muted-foreground">Sin planes configurados.</li>
          )}
        </ul>
      </section>

      <section>
        <h2 className="mb-3 font-medium">Suscripciones activas</h2>
        <ul className="space-y-3">
          {(subscriptions ?? []).map((sub) => {
            const org = Array.isArray(sub.organizations)
              ? sub.organizations[0]
              : sub.organizations;
            const plan = Array.isArray(sub.plans) ? sub.plans[0] : sub.plans;
            const vehicleCount = activeVehiclesBySub[sub.id] ?? 0;
            const monthly = vehicleCount * Number(plan?.price_per_vehicle ?? 0);

            return (
              <li key={sub.id} className="rounded-lg border p-4 text-sm">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="font-medium">{(org as { name: string } | null)?.name}</p>
                    <p className="text-muted-foreground">
                      Plan {(plan as { name: string } | null)?.name} · {vehicleCount}{" "}
                      vehículo(s) facturable(s)
                    </p>
                    <p className="mt-1 font-medium">
                      Mensualidad: {formatCurrency(monthly)}
                    </p>
                  </div>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs ${
                      sub.status === "active"
                        ? "bg-green-100 text-green-800"
                        : "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {sub.status}
                  </span>
                </div>
              </li>
            );
          })}
          {(subscriptions ?? []).length === 0 && (
            <li className="text-sm text-muted-foreground">
              Sin suscripciones. Crea una organización para generar una.
            </li>
          )}
        </ul>
        <p className="mt-4 text-sm text-muted-foreground">
          Los vehículos se vinculan a la suscripción al aprobarse en{" "}
          <Link href="/admin/vehicles" className="text-blue-600 hover:underline">
            Vehículos pendientes
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
