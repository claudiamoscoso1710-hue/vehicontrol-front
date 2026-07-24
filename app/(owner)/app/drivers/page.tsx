import {
  AlertCircle,
  Banknote,
  CheckCircle2,
  Users,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { loadDriversDashboard } from "@/lib/reports/load-drivers-dashboard";
import { formatCurrency } from "@/lib/format";
import { PageHeader } from "@/components/ui/page-header";
import { KpiCard } from "@/components/ui/kpi-card";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { CreateDriverForm } from "@/components/owner/create-driver-form";
import { DriverList } from "@/components/owner/driver-list";
import { CreateAdvanceForm } from "@/components/owner/create-advance-form";
import { DriverAccountSummaryCard } from "@/components/owner/driver-account-summary-card";

export default async function DriversPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name")
    .eq("id", user.id)
    .maybeSingle();

  const defaultDeliveredByName = profile?.full_name?.trim() ?? "";

  const { data: drivers } = await supabase
    .from("drivers")
    .select("id, full_name, phone, status, user_id, commission_percent")
    .eq("organization_id", org.organizationId)
    .order("created_at", { ascending: false });

  const driverList = drivers ?? [];
  const { entries, totals } = await loadDriversDashboard(
    supabase,
    org.organizationId,
    driverList
  );

  const canManage = ["owner", "admin"].includes(org.role);
  const canManageAdvances = ["owner", "admin", "accountant"].includes(org.role);
  const canSettle = canManageAdvances;
  const activeDrivers = driverList.filter((driver) => driver.status === "active");

  const sortedEntries = [...entries].sort((a, b) => {
    const aPending = a.statement?.hasPendingItems ? 1 : 0;
    const bPending = b.statement?.hasPendingItems ? 1 : 0;
    if (aPending !== bPending) return bPending - aPending;
    return a.driver.full_name.localeCompare(b.driver.full_name, "es");
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Conductores"
        subtitle={`${org.organizationName} · Dashboard de cuentas y período actual`}
      />

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

        {sortedEntries.length === 0 ? (
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
            {sortedEntries.map((entry) => (
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
              Alta de conductores, comisiones, acceso a la app y estado activo
            </p>
          </CardHeader>
          <CardBody className="space-y-6">
            {canManage ? (
              <CreateDriverForm organizationId={org.organizationId} />
            ) : null}
            <DriverList
              organizationId={org.organizationId}
              drivers={driverList}
              canManage={canManage}
            />
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
    </div>
  );
}
