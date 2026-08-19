import Link from "next/link";
import {
  ArrowRight,
  CircleDollarSign,
  Route,
  Scale,
  TrendingUp,
  Truck,
  Wallet,
} from "lucide-react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import {
  loadOwnerDashboardCore,
  loadOwnerRecentTrips,
} from "@/lib/reports/load-owner-dashboard";
import { resolveDashboardMonthContext } from "@/lib/reports/dashboard-month";
import { getVehicleProfitability } from "@/lib/reports/vehicle-profitability";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { VehicleProfitCard } from "@/components/owner/vehicle-profit-card";
import { FinancialBreakdownBar } from "@/components/owner/financial-breakdown-bar";

type Props = {
  month?: string;
};

export async function OwnerDashboardSummarySection({ month }: Props) {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const metrics = await loadOwnerDashboardCore(
    ctx.supabase,
    ctx.org.organizationId,
    month
  );

  const {
    monthContext,
    totalIncome,
    totalExpenses,
    vehicleExpenses,
    tripExpenses,
    margin,
    marginPct,
    openTrips,
    monthTripCount,
    settlementsInMonth,
    totalSettledNet,
  } = metrics;

  return (
    <>
      <Card className="overflow-hidden border-brand/20 bg-gradient-to-br from-brand/5 via-card to-card">
        <CardBody className="grid gap-6 p-6 lg:grid-cols-2 lg:items-center">
          <div>
            <p className="text-sm font-medium text-muted-foreground">
              Utilidad operativa del mes
            </p>
            <p
              className={`mt-2 text-4xl font-bold tracking-tight ${
                margin >= 0 ? "text-emerald-600" : "text-red-600"
              }`}
            >
              {formatCurrency(margin)}
            </p>
            {totalIncome > 0 && (
              <p className="mt-1 text-sm text-muted-foreground">
                {marginPct}% sobre ingresos de fletes
              </p>
            )}
          </div>
          <FinancialBreakdownBar income={totalIncome} expenses={totalExpenses} />
        </CardBody>
      </Card>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Fletes del mes"
          value={formatCurrency(totalIncome)}
          icon={CircleDollarSign}
          trend="up"
        />
        <KpiCard
          label="Gastos del mes"
          value={formatCurrency(totalExpenses)}
          icon={Wallet}
          trend="neutral"
        />
        <KpiCard
          label="Utilidad"
          value={formatCurrency(margin)}
          icon={TrendingUp}
          trend={margin >= 0 ? "up" : "down"}
        />
        <KpiCard
          label={
            monthContext.isCurrentMonth ? "Viajes en curso" : "Viajes del mes"
          }
          value={String(monthContext.isCurrentMonth ? openTrips : monthTripCount)}
          icon={Route}
          trend={
            monthContext.isCurrentMonth
              ? openTrips > 0
                ? "up"
                : "neutral"
              : "neutral"
          }
        />
      </section>

      {totalExpenses > 0 ? (
        <p className="-mt-4 text-sm text-muted-foreground">
          Gastos del mes asumidos por la empresa: viaje{" "}
          {formatCurrency(tripExpenses)} · vehículo {formatCurrency(vehicleExpenses)}
          . Los del vehículo se liquidan con el conductor en su propio período.
        </p>
      ) : null}

      {settlementsInMonth > 0 ? (
        <section className="flex flex-wrap items-center gap-3 rounded-xl border bg-muted/20 px-4 py-3 text-sm">
          <Scale className="h-4 w-4 text-brand" />
          <span>
            <strong>{settlementsInMonth}</strong> liquidación
            {settlementsInMonth === 1 ? "" : "es"} en este mes · saldo neto
            liquidado {formatCurrency(totalSettledNet)}
          </span>
          <Link href="/app/drivers" className="font-medium text-brand hover:underline">
            Ver conductores
          </Link>
        </section>
      ) : null}
    </>
  );
}

export async function OwnerDashboardVehiclesSection({ month }: Props) {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const monthContext = resolveDashboardMonthContext(month);
  const vehicleProfitability = await getVehicleProfitability(
    ctx.supabase,
    ctx.org.organizationId,
    {
      since: new Date(monthContext.start),
      until: new Date(monthContext.end),
    }
  );

  return (
    <section>
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Truck className="h-5 w-5 text-brand" />
          <div>
            <h2 className="font-semibold">Rentabilidad por vehículo</h2>
            <p className="text-sm capitalize text-muted-foreground">
              {monthContext.label}
            </p>
          </div>
        </div>
        <Link
          href="/app/vehicles"
          className="text-sm font-medium text-brand hover:underline"
        >
          Ver flota
        </Link>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        {vehicleProfitability.map((v, i) => (
          <VehicleProfitCard key={v.vehicleId} vehicle={v} rank={i + 1} />
        ))}
        {vehicleProfitability.length === 0 && (
          <Card className="md:col-span-2">
            <CardBody className="py-10 text-center text-sm text-muted-foreground">
              Sin datos de vehículos en este mes.
            </CardBody>
          </Card>
        )}
      </div>
    </section>
  );
}

export async function OwnerDashboardTripsSection({ month }: Props) {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const monthContext = resolveDashboardMonthContext(month);
  const [recentTrips, core] = await Promise.all([
    loadOwnerRecentTrips(ctx.supabase, ctx.org.organizationId, month),
    loadOwnerDashboardCore(ctx.supabase, ctx.org.organizationId, month),
  ]);

  const { openTrips, monthTripCount } = core;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-semibold">Viajes del mes</h2>
            <p className="text-sm text-muted-foreground">
              {monthContext.isCurrentMonth
                ? `${openTrips} en curso · ${monthTripCount} registrados en el mes`
                : `${monthTripCount} viaje${monthTripCount === 1 ? "" : "s"} en el mes`}
            </p>
          </div>
          <Link
            href="/app/trips"
            className="text-sm font-medium text-brand hover:underline"
          >
            Ver todos
          </Link>
        </div>
      </CardHeader>
      <CardBody className="space-y-2">
        {recentTrips.map((trip) => {
          const vehicle = Array.isArray(trip.vehicles)
            ? trip.vehicles[0]
            : trip.vehicles;

          return (
            <Link
              key={trip.id}
              href={`/app/trips/${trip.id}`}
              className="group flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 transition-colors hover:border-brand/30 hover:bg-brand/5"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-100 text-slate-600 group-hover:bg-brand/10 group-hover:text-brand">
                  <Route className="h-4 w-4" />
                </div>
                <div>
                  <p className="font-medium">
                    {trip.origin} → {trip.destination}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {vehicle?.plate ?? "Sin vehículo"} · Flete{" "}
                    {formatCurrency(Number(trip.freight_value ?? 0))}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge status={trip.status} />
                <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
              </div>
            </Link>
          );
        })}
        {recentTrips.length === 0 && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No hay viajes registrados en este mes.
          </p>
        )}
      </CardBody>
    </Card>
  );
}
