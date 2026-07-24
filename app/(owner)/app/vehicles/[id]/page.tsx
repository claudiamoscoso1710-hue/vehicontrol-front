import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CircleDollarSign,
  Route,
  TrendingUp,
  Truck,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { formatCurrency } from "@/lib/format";
import {
  calculateOwnerTripDriverSalary,
  resolveTripCommissionPercent,
} from "@/lib/reports/trip-owner-costs";
import { loadVehiclePeriodContext } from "@/lib/reports/load-vehicle-period-data";
import {
  CURRENT_PERIOD_ID,
  formatPeriodRange,
} from "@/lib/reports/settlement-period";
import {
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { FinancialBreakdownBar } from "@/components/owner/financial-breakdown-bar";
import { AssignDriverForm } from "@/components/owner/assign-driver-form";
import { SettlementPeriodControls } from "@/components/shared/settlement-period-controls";
import {
  VehicleReportedExpenses,
  type VehicleExpenseItem,
  type VehicleTripWithExpenses,
} from "@/components/owner/vehicle-reported-expenses";

export default async function VehicleDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
}) {
  const { id } = await params;
  const { period } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const { data: vehicle } = await supabase
    .from("vehicles")
    .select(
      "id, plate, brand, vehicle_type, operational_status, commercial_status, assigned_driver_id, created_at"
    )
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .maybeSingle();

  if (!vehicle) notFound();

  const orgConfig = await getOrganizationSetting(
    supabase,
    org.organizationId,
    DRIVER_COMPENSATION_SETTING_KEY,
    parseDriverCompensationConfig,
    DEFAULT_DRIVER_COMPENSATION
  );

  const periodContext = vehicle.assigned_driver_id
    ? await loadVehiclePeriodContext(
        supabase,
        org.organizationId,
        vehicle.assigned_driver_id,
        period
      )
    : null;

  let expensesQuery = supabase
    .from("expenses")
    .select(
      "id, amount, status, notes, created_at, trip_id, settlement_id, expense_categories(name), drivers(full_name), trips(origin, destination)"
    )
    .eq("organization_id", org.organizationId)
    .eq("vehicle_id", id)
    .eq("status", "approved");

  if (periodContext && vehicle.assigned_driver_id) {
    expensesQuery = expensesQuery.eq("driver_id", vehicle.assigned_driver_id);
    expensesQuery =
      periodContext.periodId === CURRENT_PERIOD_ID
        ? expensesQuery.is("settlement_id", null)
        : expensesQuery.eq("settlement_id", periodContext.periodId);
  }

  let tripsQuery = supabase
    .from("trips")
    .select(
      "id, origin, destination, status, freight_value, created_at, driver_id, drivers(full_name, commission_percent)"
    )
    .eq("organization_id", org.organizationId)
    .eq("vehicle_id", id)
    .order("created_at", { ascending: false })
    .limit(20);

  if (periodContext && vehicle.assigned_driver_id) {
    tripsQuery = tripsQuery.eq("driver_id", vehicle.assigned_driver_id);
    tripsQuery =
      periodContext.periodId === CURRENT_PERIOD_ID
        ? tripsQuery.is("settlement_id", null)
        : tripsQuery.eq("settlement_id", periodContext.periodId);
  }

  const [{ data: incomes }, { data: expenses }, { data: trips }, { data: drivers }] =
    await Promise.all([
      supabase
        .from("incomes")
        .select("amount, trip_id")
        .eq("organization_id", org.organizationId)
        .eq("vehicle_id", id),
      expensesQuery.order("created_at", { ascending: false }),
      tripsQuery,
      supabase
        .from("drivers")
        .select("id, full_name")
        .eq("organization_id", org.organizationId)
        .eq("status", "active")
        .order("full_name"),
    ]);

  const expenseIds = (expenses ?? []).map((expense) => expense.id);
  const { data: evidences } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", expenseIds)
      : { data: [] };
  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));

  const mappedExpenses: VehicleExpenseItem[] = (expenses ?? []).map((expense) => {
    const trip = Array.isArray(expense.trips) ? expense.trips[0] : expense.trips;

    return {
      id: expense.id,
      amount: Number(expense.amount),
      status: expense.status,
      notes: expense.notes,
      created_at: expense.created_at,
      trip_id: expense.trip_id,
      settlement_id: expense.settlement_id,
      tripLabel:
        trip?.origin && trip?.destination
          ? `${trip.origin} → ${trip.destination}`
          : null,
      vehiclePlate: vehicle.plate,
      expense_categories: expense.expense_categories,
      drivers: expense.drivers,
      hasEvidence: evidenceSet.has(expense.id),
    };
  });

  const vehicleOnlyExpenses = mappedExpenses.filter((expense) => !expense.trip_id);

  const expensesByTripId = new Map<string, VehicleExpenseItem[]>();
  for (const expense of mappedExpenses) {
    if (!expense.trip_id) continue;
    const current = expensesByTripId.get(expense.trip_id) ?? [];
    current.push(expense);
    expensesByTripId.set(expense.trip_id, current);
  }

  const tripsWithExpenses: VehicleTripWithExpenses[] = (trips ?? [])
    .map((trip) => {
      const driver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
      const commissionPercent = resolveTripCommissionPercent(
        orgConfig,
        driver?.commission_percent
      );
      const tripExpenses = expensesByTripId.get(trip.id) ?? [];
      const approvedExpenseTotal = tripExpenses.reduce(
        (sum, expense) => sum + expense.amount,
        0
      );
      const freightValue = Number(trip.freight_value ?? 0);
      const driverSalary = calculateOwnerTripDriverSalary(
        freightValue,
        approvedExpenseTotal,
        commissionPercent
      );

      return {
        id: trip.id,
        origin: trip.origin,
        destination: trip.destination,
        status: trip.status,
        freightValue,
        createdAt: trip.created_at,
        driverName: driver?.full_name ?? null,
        commissionPercent,
        driverSalary,
        expenses: tripExpenses,
      };
    })
    .filter((trip) => trip.expenses.length > 0 || trip.driverSalary > 0);

  const tripIdsInPeriod = new Set((trips ?? []).map((trip) => trip.id));
  const filteredIncomes = (incomes ?? []).filter(
    (row) => !row.trip_id || tripIdsInPeriod.has(row.trip_id)
  );

  const totalIncome =
    filteredIncomes.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const driverSalaryTotal = tripsWithExpenses.reduce(
    (sum, trip) => sum + trip.driverSalary,
    0
  );
  const reportedExpenses =
    mappedExpenses.reduce((sum, row) => sum + row.amount, 0) + driverSalaryTotal;
  const margin = totalIncome - reportedExpenses;
  const marginPct =
    totalIncome > 0 ? Math.round((margin / totalIncome) * 100) : 0;
  const closedTrips = (trips ?? []).filter((t) => t.status === "closed").length;
  const canAssignDriver = ["owner", "admin"].includes(org.role);

  return (
    <div className="space-y-8">
      <PageHeader
        title={vehicle.plate}
        subtitle={`${vehicle.brand ?? "Vehículo"} · ${vehicle.vehicle_type ?? "Sin tipo"}`}
        badge={
          <div className="flex gap-2">
            <StatusBadge status={vehicle.operational_status} />
            <StatusBadge status={vehicle.commercial_status} />
          </div>
        }
        actions={
          <Link
            href="/app/vehicles"
            className="text-sm font-medium text-brand hover:underline"
          >
            ← Flota
          </Link>
        }
      />

      {periodContext ? (
        <Suspense fallback={null}>
          <SettlementPeriodControls
            options={periodContext.options}
            selectedPeriodId={periodContext.periodId}
            periodRangeLabel={formatPeriodRange(
              periodContext.periodStart,
              periodContext.periodEnd,
              periodContext.isCurrent
            )}
            isCurrentPeriod={periodContext.isCurrent}
          />
        </Suspense>
      ) : (
        <section className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Asigna un conductor al vehículo para ver los períodos de liquidación
          compartidos (mismo período que la cuenta del conductor).
        </section>
      )}

      <Card className="overflow-hidden border-brand/20">
        <CardBody className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center">
          <div className="flex items-start gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-brand text-brand-foreground">
              <Truck className="h-8 w-8" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">
                {periodContext
                  ? periodContext.isCurrent
                    ? "Utilidad del período actual"
                    : "Utilidad del período seleccionado"
                  : "Utilidad histórica"}
              </p>
              <p
                className={`text-3xl font-bold ${
                  margin >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(margin)}
              </p>
              {totalIncome > 0 && (
                <p className="text-sm text-muted-foreground">
                  {marginPct}% de los fletes · {closedTrips} viajes cerrados
                </p>
              )}
            </div>
          </div>
          <FinancialBreakdownBar
            income={totalIncome}
            expenses={reportedExpenses}
          />
        </CardBody>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={
            periodContext?.isCurrent === false
              ? "Fletes del período"
              : "Fletes del período actual"
          }
          value={formatCurrency(totalIncome)}
          icon={CircleDollarSign}
          trend="up"
        />
        <VehicleReportedExpenses
          total={reportedExpenses}
          vehicleExpenses={vehicleOnlyExpenses}
          tripsWithExpenses={tripsWithExpenses}
        />
        <KpiCard
          label="Utilidad"
          value={formatCurrency(margin)}
          icon={TrendingUp}
          trend={margin >= 0 ? "up" : "down"}
        />
        <KpiCard
          label="Viajes totales"
          value={String(trips?.length ?? 0)}
          icon={Route}
          trend="neutral"
        />
      </section>

      {canAssignDriver ? (
        <AssignDriverForm
          organizationId={org.organizationId}
          vehicleId={vehicle.id}
          assignedDriverId={vehicle.assigned_driver_id}
          drivers={drivers ?? []}
          disabled={vehicle.operational_status === "in_trip"}
        />
      ) : null}

      <Card>
        <CardHeader>
          <h2 className="font-semibold">Viajes del período</h2>
          <p className="text-sm text-muted-foreground">
            {periodContext
              ? "Viajes del conductor asignado en el período seleccionado"
              : "Cada viaje cerrado registra el flete automáticamente"}
          </p>
        </CardHeader>
        <CardBody className="space-y-2">
          {(trips ?? []).map((trip) => (
            <Link
              key={trip.id}
              href={`/app/trips/${trip.id}`}
              className="group flex items-center justify-between rounded-xl border px-4 py-3 transition-colors hover:border-brand/30 hover:bg-brand/5"
            >
              <div className="flex items-center gap-3">
                <Route className="h-4 w-4 text-muted-foreground group-hover:text-brand" />
                <span className="font-medium">
                  {trip.origin} → {trip.destination}
                </span>
              </div>
              <div className="flex items-center gap-3 text-sm">
                <span className="font-semibold">
                  {formatCurrency(Number(trip.freight_value ?? 0))}
                </span>
                <StatusBadge status={trip.status} />
              </div>
            </Link>
          ))}
          {(trips ?? []).length === 0 && (
            <p className="py-6 text-center text-sm text-muted-foreground">
              Este vehículo aún no tiene viajes.
            </p>
          )}
        </CardBody>
      </Card>
    </div>
  );
}
