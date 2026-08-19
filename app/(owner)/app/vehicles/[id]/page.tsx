import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import {
  CircleDollarSign,
  Route,
  TrendingUp,
  Truck,
} from "lucide-react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { formatCurrency } from "@/lib/format";
import {
  calculateOwnerTripDriverSalary,
  resolveTripCommissionPercent,
} from "@/lib/reports/trip-owner-costs";
import { sumTripExpensesForSalary } from "@/lib/expenses/salary-expenses";
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
import { buildVehicleSettlementSpreadsheet } from "@/lib/reports/build-vehicle-settlement-spreadsheet";
import { getSalaryBasisLabel } from "@/lib/settings/driver-compensation";
import { SettlementSpreadsheetTable } from "@/components/owner/settlement-spreadsheet-table";
import { VehicleReportedExpensesKpi } from "@/components/owner/vehicle-reported-expenses-kpi";
import {
  type VehicleExpenseItem,
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
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org } = ctx;

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
      "id, amount, status, notes, owner_prepaid, additional_trip_expense, created_at, trip_id, settlement_id, expense_categories(name), drivers(full_name), trips(origin, destination)"
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

  let advancesQuery =
    periodContext && vehicle.assigned_driver_id
      ? supabase
          .from("advances")
          .select("id, amount, status, created_at, delivered_by_name")
          .eq("organization_id", org.organizationId)
          .eq("driver_id", vehicle.assigned_driver_id)
      : null;

  if (advancesQuery && periodContext) {
    advancesQuery =
      periodContext.periodId === CURRENT_PERIOD_ID
        ? advancesQuery.is("settlement_id", null)
        : advancesQuery.eq("settlement_id", periodContext.periodId);
  }

  const [{ data: incomes }, { data: expenses }, { data: trips }, { data: drivers }, advancesResult] =
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
      advancesQuery
        ? advancesQuery.order("created_at", { ascending: false })
        : Promise.resolve({ data: [] as { id: string; amount: number; status: string; created_at: string; delivered_by_name: string | null }[] }),
    ]);

  const advances = advancesResult.data ?? [];

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
      additional_trip_expense: Boolean(expense.additional_trip_expense),
      owner_prepaid: Boolean(expense.owner_prepaid),
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

  const periodTrips = (trips ?? []).map((trip) => {
    const driver = Array.isArray(trip.drivers) ? trip.drivers[0] : trip.drivers;
    const commissionPercent = resolveTripCommissionPercent(
      orgConfig,
      driver?.commission_percent
    );
    const tripExpenses = expensesByTripId.get(trip.id) ?? [];
    const salaryExpenseTotal = sumTripExpensesForSalary(tripExpenses);
    const freightValue = Number(trip.freight_value ?? 0);
    const driverSalary = calculateOwnerTripDriverSalary(
      freightValue,
      salaryExpenseTotal,
      commissionPercent,
      orgConfig.salary_basis
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
  });

  const tripsWithExpenses = periodTrips.filter(
    (trip) => trip.expenses.length > 0 || trip.driverSalary > 0
  );

  const tripIdsInPeriod = new Set((trips ?? []).map((trip) => trip.id));
  const filteredIncomes = (incomes ?? []).filter(
    (row) => !row.trip_id || tripIdsInPeriod.has(row.trip_id)
  );

  const totalIncome =
    filteredIncomes.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const tripExpenseTotal = periodTrips.reduce(
    (sum, trip) => sum + trip.expenses.reduce((s, e) => s + e.amount, 0),
    0
  );
  const vehicleExpenseTotal = vehicleOnlyExpenses.reduce(
    (sum, row) => sum + row.amount,
    0
  );

  const spreadsheetData = buildVehicleSettlementSpreadsheet({
    trips: periodTrips,
    vehicleExpenses: vehicleOnlyExpenses,
    advances,
    vehiclePlate: vehicle.plate,
    commissionPercent: orgConfig.commission_percent,
    salaryBasis: orgConfig.salary_basis,
  });
  const driverSalaryTotal = periodTrips.reduce(
    (sum, trip) => sum + trip.driverSalary,
    0
  );
  const reportedExpenses =
    mappedExpenses.reduce((sum, row) => sum + row.amount, 0) + driverSalaryTotal;

  const periodFreight = periodContext
    ? spreadsheetData.totals.freight
    : totalIncome;
  const periodMargin = periodContext
    ? spreadsheetData.totals.netMargin
    : totalIncome - reportedExpenses;
  const pendingFreight = spreadsheetData.totals.pendingFreight;
  const pendingTotal =
    spreadsheetData.totals.pendingFreight +
    spreadsheetData.totals.pendingTripExpenses +
    spreadsheetData.totals.pendingDriverSalary;
  const marginPct =
    periodFreight > 0 ? Math.round((periodMargin / periodFreight) * 100) : 0;
  const closedTrips = (trips ?? []).filter((t) => t.status === "closed").length;
  const inProgressTrips = (trips ?? []).filter((t) => t.status === "in_progress").length;
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
                    ? "Utilidad confirmada del período actual"
                    : "Utilidad confirmada del período seleccionado"
                  : "Utilidad histórica"}
              </p>
              <p
                className={`text-3xl font-bold ${
                  periodMargin >= 0 ? "text-emerald-600" : "text-red-600"
                }`}
              >
                {formatCurrency(periodMargin)}
              </p>
              {periodFreight > 0 && (
                <p className="text-sm text-muted-foreground">
                  {marginPct}% sobre fletes cerrados ·{" "}
                  {closedTrips === 1
                    ? "1 viaje cerrado"
                    : `${closedTrips} viajes cerrados`}
                  {inProgressTrips > 0
                    ? ` · ${inProgressTrips} en curso (pendiente)`
                    : ""}
                </p>
              )}
              {pendingTotal > 0 ? (
                <p className="mt-1 text-xs text-amber-800">
                  Pendiente en viajes en curso: flete {formatCurrency(pendingFreight)}
                  {spreadsheetData.totals.pendingTripExpenses > 0
                    ? ` · gastos ${formatCurrency(spreadsheetData.totals.pendingTripExpenses)}`
                    : ""}
                  {spreadsheetData.totals.pendingDriverSalary > 0
                    ? ` · sueldo est. ${formatCurrency(spreadsheetData.totals.pendingDriverSalary)}`
                    : ""}
                  . No suma a utilidad hasta cerrar.
                </p>
              ) : null}
            </div>
          </div>
          <FinancialBreakdownBar
            income={periodFreight}
            expenses={periodFreight - periodMargin}
          />
        </CardBody>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard
          label={
            periodContext?.isCurrent === false
              ? "Fletes confirmados"
              : "Fletes confirmados del período"
          }
          value={formatCurrency(periodFreight)}
          icon={CircleDollarSign}
          trend="up"
        />
        <VehicleReportedExpensesKpi
          total={reportedExpenses}
          tripCount={tripsWithExpenses.length}
          tripTotal={tripExpenseTotal + driverSalaryTotal}
          vehicleTotal={vehicleExpenseTotal}
        />
        <KpiCard
          label="Utilidad confirmada"
          value={formatCurrency(periodMargin)}
          icon={TrendingUp}
          trend={periodMargin >= 0 ? "up" : "down"}
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

      {periodContext ? (
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Detalle del período</h2>
            <p className="text-sm text-muted-foreground">
              Mismo período de liquidación que la cuenta del conductor asignado ·{" "}
              {getSalaryBasisLabel(orgConfig.salary_basis).toLowerCase()}
            </p>
          </CardHeader>
          <CardBody>
            <SettlementSpreadsheetTable
              data={spreadsheetData}
              showVehicleNetMargin
            />
          </CardBody>
        </Card>
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
