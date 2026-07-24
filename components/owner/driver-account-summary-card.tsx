"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Banknote,
  CalendarRange,
  CheckCircle2,
  Route,
  Scale,
  Truck,
  User,
  Wallet,
} from "lucide-react";
import { Button, buttonVariants } from "@/components/ui/button";
import { CreateAdvanceForm } from "@/components/owner/create-advance-form";
import { formatCurrency } from "@/lib/format";
import {
  getSettlementPaymentLabel,
} from "@/lib/reports/driver-account-statement";
import type { DriverDashboardEntry } from "@/lib/reports/load-drivers-dashboard";

type Props = {
  organizationId: string;
  entry: DriverDashboardEntry;
  canManageAdvances: boolean;
  canSettle: boolean;
  defaultDeliveredByName?: string;
};

function driverInitials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function DriverAccountSummaryCard({
  organizationId,
  entry,
  canManageAdvances,
  canSettle,
  defaultDeliveredByName = "",
}: Props) {
  const [showAdvance, setShowAdvance] = useState(false);
  const { driver, assignedVehicle, inProgressTrips, statement } = entry;
  const isActive = driver.status === "active";
  const payment = statement
    ? getSettlementPaymentLabel(statement.netBalance)
    : null;

  return (
    <article
      className={`overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md ${
        isActive ? "border-border/80" : "border-dashed opacity-80"
      }`}
    >
      <div className="border-b bg-gradient-to-r from-brand/5 via-card to-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-brand/10 text-sm font-bold text-brand">
              {driverInitials(driver.full_name)}
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="truncate font-semibold">{driver.full_name}</h3>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                    isActive
                      ? "bg-emerald-50 text-emerald-700"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {isActive ? "Activo" : "Inactivo"}
                </span>
                {inProgressTrips > 0 ? (
                  <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
                    {inProgressTrips} viaje en curso
                  </span>
                ) : null}
              </div>
              <p className="mt-1 text-sm text-muted-foreground">
                {driver.phone ?? "Sin teléfono"}
                {driver.user_id ? " · Con acceso a la app" : " · Sin usuario"}
              </p>
              {assignedVehicle ? (
                <Link
                  href={`/app/vehicles/${assignedVehicle.id}`}
                  className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
                >
                  <Truck className="h-3.5 w-3.5" />
                  {assignedVehicle.plate}
                </Link>
              ) : (
                <p className="mt-2 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
                  <Truck className="h-3.5 w-3.5" />
                  Sin vehículo asignado
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      {statement ? (
        <>
          <div className="space-y-4 p-5">
            <div className="flex items-start gap-2 text-sm">
              <CalendarRange className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div>
                <p className="font-medium">Período actual</p>
                <p className="text-muted-foreground">{statement.periodRangeLabel}</p>
              </div>
            </div>

            {statement.hasPendingItems ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Sueldo</p>
                  <p className="mt-1 font-semibold text-emerald-700">
                    {formatCurrency(statement.totalEarnings)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Gastos</p>
                  <p className="mt-1 font-semibold">
                    {formatCurrency(statement.reimbursableExpenses)}
                  </p>
                </div>
                <div className="rounded-xl bg-muted/40 p-3">
                  <p className="text-xs text-muted-foreground">Anticipos</p>
                  <p className="mt-1 font-semibold text-amber-700">
                    −{formatCurrency(statement.totalAdvances)}
                  </p>
                </div>
                <div className="rounded-xl border border-brand/20 bg-brand/5 p-3">
                  <p className="text-xs text-muted-foreground">
                    {payment?.action ?? "Saldo"}
                  </p>
                  <p
                    className={`mt-1 font-bold ${
                      statement.netBalance > 0
                        ? "text-emerald-700"
                        : statement.netBalance < 0
                          ? "text-amber-700"
                          : ""
                    }`}
                  >
                    {formatCurrency(Math.abs(statement.netBalance))}
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-4">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
                <div>
                  <p className="font-medium text-emerald-900">Cuenta al día</p>
                  <p className="mt-1 text-sm text-emerald-800">
                    Sin movimientos pendientes de liquidar en el período actual.
                  </p>
                </div>
              </div>
            )}

            {statement.hasPendingItems ? (
              <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <Route className="h-3 w-3" />
                  {statement.tripRows.length} viaje
                  {statement.tripRows.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <Wallet className="h-3 w-3" />
                  {statement.expenseRows.length} gasto
                  {statement.expenseRows.length === 1 ? "" : "s"}
                </span>
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1">
                  <Banknote className="h-3 w-3" />
                  {statement.advances.length} anticipo
                  {statement.advances.length === 1 ? "" : "s"}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t bg-muted/20 px-5 py-4">
            {canManageAdvances ? (
              <Button
                type="button"
                variant={showAdvance ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowAdvance((value) => !value)}
              >
                <Banknote data-icon="inline-start" />
                Anticipo
              </Button>
            ) : null}
            <Link
              href={`/app/drivers/${driver.id}/account`}
              className={buttonVariants({ variant: "outline", size: "sm" })}
            >
              <User data-icon="inline-start" />
              Ver cuenta
              <ArrowRight data-icon="inline-end" />
            </Link>
            {canSettle && statement.hasPendingItems ? (
              <Link
                href={`/app/drivers/${driver.id}/account`}
                className={buttonVariants({ size: "sm" })}
              >
                <Scale data-icon="inline-start" />
                Liquidar
              </Link>
            ) : null}
          </div>

          {showAdvance && canManageAdvances ? (
            <div className="border-t bg-muted/10 p-5">
              <CreateAdvanceForm
                organizationId={organizationId}
                drivers={[{ id: driver.id, full_name: driver.full_name }]}
                fixedDriverId={driver.id}
                compact
                defaultDeliveredByName={defaultDeliveredByName}
                onSuccess={() => setShowAdvance(false)}
              />
            </div>
          ) : null}
        </>
      ) : (
        <div className="space-y-4 p-5">
          <p className="text-sm text-muted-foreground">
            Conductor inactivo. Actívalo para ver el resumen de cuenta del período
            actual.
          </p>
          <Link
            href={`/app/drivers/${driver.id}/account`}
            className={buttonVariants({ variant: "outline", size: "sm" })}
          >
            Ver historial
          </Link>
        </div>
      )}
    </article>
  );
}
