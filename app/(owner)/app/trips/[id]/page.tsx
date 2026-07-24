import Link from "next/link";
import { notFound } from "next/navigation";
import { MapPin, Navigation } from "lucide-react";
import { TripCostList } from "@/components/owner/trip-cost-list";
import { TripFinancialSummary } from "@/components/owner/trip-financial-summary";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
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
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardBody } from "@/components/ui/card";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TripDetailPage({ params }: Props) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const { data: trip } = await supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, started_at, closed_at, vehicle_id, driver_id, drivers(full_name, commission_percent), vehicles(plate), clients(name)"
    )
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .single();

  if (!trip) notFound();

  const orgConfig = await getOrganizationSetting(
    supabase,
    org.organizationId,
    DRIVER_COMPENSATION_SETTING_KEY,
    parseDriverCompensationConfig,
    DEFAULT_DRIVER_COMPENSATION
  );

  const { data: expenses } = await supabase
    .from("expenses")
    .select(
      "id, amount, status, notes, created_at, expense_categories(name), drivers(full_name)"
    )
    .eq("trip_id", id)
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  const expenseTotal =
    expenses
      ?.filter((e) => e.status === "approved")
      .reduce((sum, e) => sum + Number(e.amount), 0) ?? 0;
  const freightValue = Number(trip.freight_value ?? 0);
  const tripDriver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
  const commissionPercent = resolveTripCommissionPercent(
    orgConfig,
    tripDriver?.commission_percent
  );
  const driverSalary = calculateOwnerTripDriverSalary(
    freightValue,
    expenseTotal,
    commissionPercent
  );

  const { data: expenseEvidences } = await supabase
    .from("expense_evidences")
    .select("expense_id")
    .eq("organization_id", org.organizationId)
    .in("expense_id", (expenses ?? []).map((e) => e.id));

  const evidenceSet = new Set(
    (expenseEvidences ?? []).map((e) => e.expense_id)
  );

  const expensesWithEvidence = (expenses ?? []).map((e) => ({
    ...e,
    hasEvidence: evidenceSet.has(e.id),
  }));

  const { data: existingIncome } = await supabase
    .from("incomes")
    .select("id")
    .eq("trip_id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

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
              Cliente: {client?.name ?? "N/A"} · Flete{" "}
              {formatCurrency(freightValue)}
            </p>
          </div>
        </CardBody>
      </Card>

      <TripFinancialSummary
        freightValue={freightValue}
        reportedExpenseTotal={expenseTotal}
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
        />
      </section>
    </main>
  );
}
