import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";
import { TripCostList } from "@/components/owner/trip-cost-list";
import { TripFinancialSummary } from "@/components/owner/trip-financial-summary";
import { OwnerEditTripPanel } from "@/components/owner/owner-edit-trip-panel";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
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
import { formatCurrency } from "@/lib/format";
import { driverHoldsFreight, DRIVER_HELD_FREIGHT_OWNER_HINT } from "@/lib/reports/driver-held-freight";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardBody } from "@/components/ui/card";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org } = ctx;

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, started_at, closed_at, vehicle_id, driver_id, client_id, settlement_id, drivers(full_name, commission_percent), vehicles(plate), clients(name)"
    )
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .single();

  const caps = getOrgCapabilities(org.role);

  const [
    orgConfig,
    { data: expenses },
    { data: existingIncome },
    { data: vehicles },
    { data: drivers },
    { data: clients },
    { data: categories },
  ] = await Promise.all([
    getOrganizationSetting(
      supabase,
      org.organizationId,
      DRIVER_COMPENSATION_SETTING_KEY,
      parseDriverCompensationConfig,
      DEFAULT_DRIVER_COMPENSATION
    ),
    supabase
      .from("expenses")
      .select(
        "id, amount, status, notes, owner_prepaid, additional_trip_expense, category_id, settlement_id, created_at, trip_id, expense_categories(name), drivers(full_name)"
      )
      .eq("trip_id", id)
      .eq("organization_id", org.organizationId)
      .order("created_at", { ascending: false }),
    supabase
      .from("incomes")
      .select("id")
      .eq("trip_id", id)
      .eq("organization_id", org.organizationId)
      .maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, plate")
      .eq("organization_id", org.organizationId)
      .eq("commercial_status", "active")
      .order("plate"),
    supabase
      .from("drivers")
      .select("id, full_name")
      .eq("organization_id", org.organizationId)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", org.organizationId)
      .order("name"),
    caps?.canManageExpenses
      ? supabase
          .from("expense_categories")
          .select("id, name, scope")
          .eq("organization_id", org.organizationId)
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string; scope: string }[] }),
  ]);

  if (!trip) notFound();

  let vehicleExpensesDuringTrip: NonNullable<typeof expenses> = [];
  if (trip.vehicle_id && trip.driver_id && trip.started_at) {
    let vehicleQuery = supabase
      .from("expenses")
      .select(
        "id, amount, status, notes, owner_prepaid, additional_trip_expense, category_id, settlement_id, created_at, trip_id, expense_categories(name), drivers(full_name)"
      )
      .is("trip_id", null)
      .eq("vehicle_id", trip.vehicle_id)
      .eq("driver_id", trip.driver_id)
      .eq("organization_id", org.organizationId)
      .gte("created_at", trip.started_at);

    if (trip.closed_at) {
      vehicleQuery = vehicleQuery.lte("created_at", trip.closed_at);
    }

    const { data: vehicleRows } = await vehicleQuery.order("created_at", {
      ascending: false,
    });
    vehicleExpensesDuringTrip = vehicleRows ?? [];
  }

  const mergedExpenses = [...(expenses ?? []), ...vehicleExpensesDuringTrip].sort(
    (a, b) =>
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );

  const reportedExpenseTotal =
    mergedExpenses
      .filter((e) => e.status === "approved")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const salaryExpenseTotal = mergedExpenses
    .filter(
      (e) =>
        e.status === "approved" &&
        e.trip_id === id &&
        !e.additional_trip_expense
    )
    .reduce((sum, e) => sum + Number(e.amount), 0);
  const freightValue = Number(trip.freight_value ?? 0);
  const tripDriver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
  const commissionPercent = resolveTripCommissionPercent(
    orgConfig,
    tripDriver?.commission_percent
  );
  const driverSalary = calculateOwnerTripDriverSalary(
    freightValue,
    salaryExpenseTotal,
    commissionPercent,
    orgConfig.salary_basis
  );

  const { data: tripExpenseEvidences } =
    mergedExpenses.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .eq("organization_id", org.organizationId)
          .in("expense_id", mergedExpenses.map((e) => e.id))
      : { data: [] as { expense_id: string }[] };

  const evidenceSet = new Set(
    (tripExpenseEvidences ?? []).map((e) => e.expense_id)
  );

  const expensesWithEvidence = mergedExpenses.map((e) => ({
    ...e,
    hasEvidence: evidenceSet.has(e.id),
  }));

  const allCategories = (categories ?? []).map((c) => ({
    id: c.id,
    name: c.name,
    scope: (c.scope === "vehicle" ? "vehicle" : "trip") as "trip" | "vehicle",
  }));
  const canManageExpenses = Boolean(caps?.canManageExpenses);
  const canManageTrips = Boolean(caps?.canManageTrips);

  const driver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
  const vehicle = Array.isArray(trip.vehicles) ? trip.vehicles[0] : trip.vehicles;
  const client = Array.isArray(trip.clients) ? trip.clients[0] : trip.clients;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <Link href="/app/trips" className="text-sm text-brand hover:underline">
        ← Volver a viajes
      </Link>

      <Card className="overflow-hidden">
        <CardBody className="space-y-4 p-0">
          <div className="border-b bg-muted/40 px-5 py-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand text-brand-foreground">
                  <Navigation className="h-5 w-5" />
                </div>
                <div>
                  <h1 className="text-xl font-bold">
                    {trip.origin} → {trip.destination}
                  </h1>
                  <p className="mt-1 flex items-center gap-1 text-sm text-muted-foreground">
                    <MapPin className="h-3.5 w-3.5" />
                    {vehicle?.plate} · {driver?.full_name}
                  </p>
                </div>
              </div>
              <StatusBadge status={trip.status} />
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Cliente: {client?.name ?? "Sin cliente (flete en mano del conductor)"} · Flete{" "}
              {formatCurrency(freightValue)}
            </p>
            {driverHoldsFreight(trip.client_id) ? (
              <p className="mt-2 rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 text-sm text-orange-950">
                {DRIVER_HELD_FREIGHT_OWNER_HINT}
              </p>
            ) : null}
            {canManageTrips && trip.driver_id && trip.vehicle_id ? (
              <div className="mt-4">
                <OwnerEditTripPanel
                  organizationId={org.organizationId}
                  tripId={trip.id}
                  origin={trip.origin ?? ""}
                  destination={trip.destination ?? ""}
                  freightValue={freightValue}
                  status={trip.status}
                  vehicleId={trip.vehicle_id}
                  driverId={trip.driver_id}
                  clientId={trip.client_id}
                  settlementId={trip.settlement_id}
                  vehicles={(vehicles ?? []).map((v) => ({
                    id: v.id,
                    label: v.plate,
                  }))}
                  drivers={(drivers ?? []).map((d) => ({
                    id: d.id,
                    label: d.full_name,
                  }))}
                  clients={(clients ?? []).map((c) => ({
                    id: c.id,
                    label: c.name,
                  }))}
                />
              </div>
            ) : null}
          </div>
        </CardBody>
      </Card>

      <TripFinancialSummary
        freightValue={freightValue}
        reportedExpenseTotal={reportedExpenseTotal}
        driverSalary={driverSalary}
        commissionPercent={commissionPercent}
        vehiclePlate={vehicle?.plate}
        vehicleId={trip.vehicle_id ?? undefined}
        incomeRegistered={!!existingIncome || trip.status === "closed"}
      />

      <section>
        <h2 className="mb-3 font-semibold">Gastos del viaje</h2>
        <p className="mb-3 text-sm text-muted-foreground">
          Incluye el sueldo del conductor ({commissionPercent}% del flete) y los
          gastos reportados que asume la empresa.
        </p>
        <TripCostList
          expenses={expensesWithEvidence}
          driverName={driver?.full_name}
          commissionPercent={commissionPercent}
          driverSalary={driverSalary}
          salaryEstimated={trip.status !== "closed"}
          emptyMessage="Sin otros gastos reportados en este viaje."
          canManageExpenses={canManageExpenses}
          organizationId={org.organizationId}
          tripId={trip.id}
          tripSettled={Boolean(trip.settlement_id)}
          categories={allCategories}
        />
      </section>
    </main>
  );
}
