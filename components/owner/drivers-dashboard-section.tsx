import { Suspense } from "react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { loadDriversDashboard } from "@/lib/reports/load-drivers-dashboard";
import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { DriverTeamManager } from "@/components/owner/driver-team-manager";
import { loadDriverTeam } from "@/lib/reports/load-driver-team";
import { CreateAdvanceForm } from "@/components/owner/create-advance-form";
import { DriverAccountSummaryCard } from "@/components/owner/driver-account-summary-card";
import {
  DashboardSectionSkeleton,
  KpiRowSkeleton,
} from "@/components/shared/page-loading-skeleton";

export async function DriversDashboardContent() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { supabase, org, user } = ctx;

  const canManage = ["owner", "admin"].includes(org.role);

  const [{ data: profile }, dashboard, team] = await Promise.all([
    supabase.from("profiles").select("full_name").eq("id", user.id).maybeSingle(),
    loadDriversDashboard(supabase, org.organizationId),
    canManage
      ? loadDriverTeam(supabase, org.organizationId)
      : Promise.resolve({ drivers: [], vehicles: [] }),
  ]);

  const defaultDeliveredByName = profile?.full_name?.trim() ?? "";
  const { entries, totals, drivers: driverList } = dashboard;
  const canManageAdvances = ["owner", "admin", "accountant"].includes(org.role);
  const canSettle = canManageAdvances;
  const activeDrivers = driverList.filter((driver) => driver.status === "active");

  return (
    <>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Conductores activos"
          value={String(totals.activeCount)}
          icon={Users}
          trend="neutral"
        />
        <KpiCard
          label="Con saldo pendiente"
          value={String(totals.pendingCount)}
          icon={AlertCircle}
          trend={totals.pendingCount > 0 ? "alert" : "up"}
        />
        <KpiCard
          label="Total a pagar"
          value={formatCurrency(totals.totalToPay)}
          icon={Wallet}
          trend={totals.totalToPay > 0 ? "up" : "neutral"}
        />
        <KpiCard
          label="Total a recuperar"
          value={formatCurrency(totals.totalToRecover)}
          icon={Banknote}
          trend={totals.totalToRecover > 0 ? "alert" : "neutral"}
        />
      </section>

      <section className="space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Resumen por conductor</h2>
            <p className="text-sm text-muted-foreground">
              Período actual de liquidación · acciones rápidas de anticipo y
              liquidación
            </p>
          </div>
          {totals.pendingCount === 0 && totals.activeCount > 0 ? (
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1.5 text-sm text-emerald-800">
              <CheckCircle2 className="h-4 w-4" />
              Todas las cuentas al día
            </div>
          ) : null}
        </div>

        {entries.length === 0 ? (
          <Card>
            <CardBody className="p-8 text-center">
              <p className="text-sm text-muted-foreground">
                Aún no hay conductores. Crea el primero en la sección de
                administración.
              </p>
            </CardBody>
          </Card>
        ) : (
          <div className="grid gap-5 xl:grid-cols-2">
            {entries.map((entry) => (
              <DriverAccountSummaryCard
                key={entry.driver.id}
                organizationId={org.organizationId}
                entry={entry}
                canManageAdvances={canManageAdvances}
                canSettle={canSettle}
                defaultDeliveredByName={defaultDeliveredByName}
              />
            ))}
          </div>
        )}
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardHeader>
            <h2 className="font-semibold">Administración del equipo</h2>
            <p className="text-sm text-muted-foreground">
              Cuentas de acceso, vehículos asignados y comisiones
            </p>
          </CardHeader>
          <CardBody>
            {canManage ? (
              <DriverTeamManager
                organizationId={org.organizationId}
                drivers={team.drivers}
                vehicles={team.vehicles}
              />
            ) : (
              <p className="text-sm text-muted-foreground">
                No tienes permisos para administrar conductores.
              </p>
            )}
          </CardBody>
        </Card>

        {canManageAdvances ? (
          <Card>
            <CardHeader>
              <h2 className="font-semibold">Anticipo general</h2>
              <p className="text-sm text-muted-foreground">
                Registra un anticipo eligiendo conductor
              </p>
            </CardHeader>
            <CardBody>
              <CreateAdvanceForm
                organizationId={org.organizationId}
                drivers={activeDrivers.map((driver) => ({
                  id: driver.id,
                  full_name: driver.full_name,
                }))}
                defaultDeliveredByName={defaultDeliveredByName}
              />
            </CardBody>
          </Card>
        ) : null}
      </div>
    </>
  );
}

export function DriversDashboardFallback() {
  return (
    <>
      <KpiRowSkeleton />
      <DashboardSectionSkeleton rows={4} />
    </>
  );
}

export function DriversDashboardSection() {
  return (
    <Suspense fallback={<DriversDashboardFallback />}>
      <DriversDashboardContent />
    </Suspense>
  );
}
