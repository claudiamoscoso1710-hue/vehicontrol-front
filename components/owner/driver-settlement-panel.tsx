"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Scale } from "lucide-react";
import { Button } from "@/components/ui/button";
import { createDriverSettlement } from "@/lib/actions/driver-settlements";
import { formatCurrency } from "@/lib/format";
import {
  getSettlementPaymentLabel,
  type DriverAccountStatement,
} from "@/lib/reports/driver-account-statement";
import { DRIVER_HELD_FREIGHT_SHORT } from "@/lib/reports/driver-held-freight";

type Props = {
  organizationId: string;
  driverId: string;
  statement: DriverAccountStatement;
};

export function DriverSettlementPanel({
  organizationId,
  driverId,
  statement,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const payment = getSettlementPaymentLabel(statement.netBalance);

  async function handleSettle() {
    if (
      !confirm(
        `¿Liquidar la cuenta pendiente?\n\n${payment.action}: ${formatCurrency(Math.abs(statement.netBalance))}\n\nTras liquidar, estos movimientos quedarán cerrados y el saldo pendiente será $0.`
      )
    ) {
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(false);

    const result = await createDriverSettlement(organizationId, driverId);

    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess(true);
      router.refresh();
    }

    setLoading(false);
  }

  if (!statement.hasPendingItems) {
    return (
      <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700" />
          <div>
            <p className="font-semibold text-emerald-900">Cuenta al día</p>
            <p className="mt-1 text-sm text-emerald-800">
              No hay viajes, gastos (viaje o vehículo) ni anticipos pendientes de
              liquidar.
            </p>
          </div>
        </div>
      </section>
    );
  }

  return (
    <section className="space-y-4 rounded-xl border p-5">
      <div className="flex items-start gap-3">
        <Scale className="mt-0.5 h-5 w-5 shrink-0 text-brand" />
        <div>
          <h2 className="font-semibold">Liquidar cuenta</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Cierra el período pendiente: {statement.tripRows.length} viaje
            {statement.tripRows.length === 1 ? "" : "s"},{" "}
            {statement.tripExpenseRows.length} gasto
            {statement.tripExpenseRows.length === 1 ? "" : "s"} de viaje,{" "}
            {statement.vehicleExpenseRows.length} gasto
            {statement.vehicleExpenseRows.length === 1 ? "" : "s"} del vehículo,{" "}
            {statement.totalFreightHeld > 0
              ? `${formatCurrency(statement.totalFreightHeld)} flete en mano, `
              : ""}
            {statement.advances.length} anticipo
            {statement.advances.length === 1 ? "" : "s"}.
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Sueldo (% del flete)</p>
          <p className="mt-1 font-semibold text-emerald-700">
            {formatCurrency(statement.totalEarnings)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Gastos a reembolsar</p>
          <p className="mt-1 font-semibold">
            {formatCurrency(statement.reimbursableExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Viaje {formatCurrency(statement.totalTripExpenses)} · Vehículo{" "}
            {formatCurrency(statement.totalVehicleExpenses)} · Asume la empresa
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">{DRIVER_HELD_FREIGHT_SHORT}</p>
          <p className="mt-1 font-semibold text-orange-700">
            −{formatCurrency(statement.totalFreightHeld)}
          </p>
        </div>
        <div className="rounded-lg bg-muted/40 p-3 text-sm">
          <p className="text-muted-foreground">Anticipos</p>
          <p className="mt-1 font-semibold text-amber-700">
            −{formatCurrency(statement.totalAdvances)}
          </p>
        </div>
        <div className="rounded-lg border border-brand/20 bg-brand/5 p-3 text-sm">
          <p className="text-muted-foreground">{payment.action}</p>
          <p className="mt-1 text-lg font-bold">
            {formatCurrency(Math.abs(statement.netBalance))}
          </p>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{payment.description}</p>

      {error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : null}

      {success ? (
        <p className="text-sm font-medium text-emerald-700">
          Liquidación registrada. La cuenta pendiente quedó en $0.
        </p>
      ) : (
        <Button onClick={handleSettle} disabled={loading}>
          {loading ? "Liquidando…" : "Liquidar cuenta"}
        </Button>
      )}
    </section>
  );
}
