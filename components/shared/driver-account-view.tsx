import {
  ArrowDownLeft,
  ArrowUpRight,
  Banknote,
  CheckCircle2,
  Info,
  Receipt,
  Scale,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { DriverAccountStatement } from "@/lib/reports/driver-account-statement";
import { getSettlementPaymentLabel } from "@/lib/reports/driver-account-statement";
import {
  DriverPageContainer,
  DriverPageHeader,
  DriverSectionCard,
} from "@/components/driver/driver-ui";
import { DriverAccountTripList } from "@/components/driver/driver-account-trip-list";
import { DriverVehicleExpenseList } from "@/components/driver/driver-vehicle-expense-list";
import { cn } from "@/lib/utils";

type Props = {
  statement: DriverAccountStatement;
  driverName: string;
  variant?: "driver" | "owner";
};

function SettlementHistory({
  settlements,
  compact = false,
}: {
  settlements: DriverAccountStatement["settlements"];
  compact?: boolean;
}) {
  if (settlements.length === 0) return null;

  return (
    <section className={compact ? "space-y-2" : "space-y-3"}>
      <h2 className={compact ? "text-sm font-medium" : "font-semibold"}>
        Historial de liquidaciones
      </h2>
      <ul className="space-y-2">
        {settlements.map((settlement) => {
          const payment = getSettlementPaymentLabel(settlement.netBalance);
          return (
            <li
              key={settlement.id}
              className={cn(
                "rounded-lg border p-3 text-sm",
                !compact && "rounded-2xl"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-medium">{settlement.periodLabel}</p>
                  <p className="text-xs text-muted-foreground">
                    Liquidado el{" "}
                    {new Date(settlement.settledAt).toLocaleDateString("es-CO")}
                    {settlement.tripCount > 0
                      ? ` · ${settlement.tripCount} viaje${settlement.tripCount === 1 ? "" : "s"}`
                      : ""}
                    {settlement.tripExpenseCount + settlement.vehicleExpenseCount > 0
                      ? ` · ${settlement.tripExpenseCount + settlement.vehicleExpenseCount} gasto${settlement.tripExpenseCount + settlement.vehicleExpenseCount === 1 ? "" : "s"}`
                      : ""}
                    {settlement.vehicleExpenseCount > 0
                      ? ` (${settlement.vehicleExpenseCount} del vehículo)`
                      : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold">
                    {formatCurrency(Math.abs(settlement.netBalance))}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {payment.action}
                  </p>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export function DriverAccountView({
  statement,
  driverName,
  variant = "driver",
}: Props) {
  const isPositive = statement.netBalance > 0;
  const isNegative = statement.netBalance < 0;
  const payment = getSettlementPaymentLabel(statement.netBalance);

  const balanceLabel = isPositive
    ? "Saldo a tu favor"
    : isNegative
      ? "Saldo pendiente"
      : "Sin saldo";

  const balanceHint = statement.hasPendingItems
    ? isPositive
      ? "La empresa te debe este monto por sueldo y gastos sin anticipos."
      : isNegative
        ? "Debes devolver el restante por anticipos recibidos."
        : "Tu sueldo, gastos y anticipos están equilibrados."
    : "No tienes movimientos pendientes de liquidar.";

  if (variant === "driver") {
    return (
      <DriverPageContainer>
        <DriverPageHeader
          eyebrow={statement.periodRangeLabel}
          title="Mi cuenta"
          subtitle={`${driverName} · ${statement.isCurrentPeriod ? "Período actual" : "Período liquidado"}`}
        />

        <section
          className={cn(
            "overflow-hidden rounded-3xl border p-5 shadow-md",
            isPositive && "border-emerald-200 bg-gradient-to-br from-emerald-50 to-card",
            isNegative && "border-amber-200 bg-gradient-to-br from-amber-50 to-card",
            !isPositive && !isNegative && "border-border bg-card"
          )}
        >
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            {balanceLabel}
          </p>
          <p className="mt-2 font-display text-4xl font-bold tracking-tight">
            {formatCurrency(Math.abs(statement.netBalance))}
          </p>
          <p className="mt-2 text-sm text-muted-foreground">{balanceHint}</p>
          {statement.hasPendingItems ? (
            <p className="mt-1 text-xs text-muted-foreground">{payment.action}</p>
          ) : null}

          <div className="mt-5 grid grid-cols-3 gap-2">
            <div className="rounded-2xl bg-white/70 px-3 py-3">
              <div className="flex items-center gap-1.5 text-emerald-700">
                <TrendingUp className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Sueldo
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {formatCurrency(statement.totalEarnings)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-3">
              <div className="flex items-center gap-1.5 text-blue-700">
                <Receipt className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Gastos
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {formatCurrency(statement.reimbursableExpenses)}
              </p>
            </div>
            <div className="rounded-2xl bg-white/70 px-3 py-3">
              <div className="flex items-center gap-1.5 text-amber-700">
                <TrendingDown className="h-4 w-4" />
                <span className="text-[10px] font-bold uppercase tracking-wide">
                  Anticipos
                </span>
              </div>
              <p className="mt-1 text-sm font-bold">
                {formatCurrency(statement.totalAdvances)}
              </p>
            </div>
          </div>
        </section>

        <div className="flex gap-3 rounded-2xl border border-brand/15 bg-brand/5 p-4 text-sm">
          <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
          <div className="space-y-1">
            <p className="font-semibold">
              Sueldo: {statement.commissionPercent}% del flete
            </p>
            <p className="text-muted-foreground">
              {statement.driverSalaryLabel}. Los gastos de viaje y del vehículo se
              reembolsan aparte y los asume la empresa. Al liquidar, el dueño
              cierra el período y la cuenta pendiente queda en $0.
            </p>
          </div>
        </div>

        {!statement.hasPendingItems ? (
          <div className="flex gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" />
            <p className="text-emerald-900">
              Tu cuenta está al día. Cuando cierres nuevos viajes o registres
              gastos, aparecerán aquí como pendientes.
            </p>
          </div>
        ) : null}

        <DriverSectionCard title="Viajes" icon={Banknote}>
          <DriverAccountTripList
            trips={statement.tripRows}
            commissionPercent={statement.commissionPercent}
            emptyMessage="Sin viajes cerrados pendientes de liquidar."
          />
        </DriverSectionCard>

        <DriverSectionCard title="Gastos del vehículo" icon={Receipt}>
          <DriverVehicleExpenseList
            expenses={statement.vehicleExpenseRows}
            emptyMessage="Sin gastos del vehículo pendientes de liquidar."
          />
          {statement.vehicleExpenseRows.length > 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              Estos gastos entran en la liquidación y los asume el dueño (
              {formatCurrency(statement.totalVehicleExpenses)}).
            </p>
          ) : null}
        </DriverSectionCard>

        <DriverSectionCard title="Anticipos" icon={Wallet}>
          {statement.advances.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              Sin anticipos pendientes de liquidar.
            </p>
          ) : (
            <ul className="space-y-3">
              {statement.advances.map((advance) => (
                <li
                  key={advance.id}
                  className="flex items-center justify-between rounded-2xl border border-border/60 bg-muted/20 p-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
                      <ArrowDownLeft className="h-4 w-4" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {formatCurrency(advance.amount)}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {advance.status === "open" ? "Abierto" : "Liquidado"} ·{" "}
                        {new Date(advance.createdAt).toLocaleDateString("es-CO")}
                        {advance.deliveredByName
                          ? ` · Entregado por ${advance.deliveredByName}`
                          : ""}
                      </p>
                    </div>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                </li>
              ))}
            </ul>
          )}
        </DriverSectionCard>

        {statement.settlements.length > 0 ? (
          <DriverSectionCard title="Liquidaciones" icon={Scale}>
            <SettlementHistory settlements={statement.settlements} />
          </DriverSectionCard>
        ) : null}
      </DriverPageContainer>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-lg font-semibold">Estado de cuenta</h1>
        <p className="text-sm text-muted-foreground">
          {driverName} · {statement.periodRangeLabel}
        </p>
      </div>

      <div className="flex gap-3 rounded-lg border p-4 text-sm">
        <Info className="mt-0.5 h-4 w-4 shrink-0 text-brand" />
        <p>
          <strong>Sueldo:</strong> {statement.commissionPercent}% del flete ·{" "}
          {statement.driverSalaryLabel.toLowerCase()}. Los gastos de viaje y del
          vehículo se reembolsan aparte y los asume la empresa. Al liquidar, los
          movimientos pendientes se cierran y el saldo queda en $0.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-4">
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Sueldo ganado</p>
          <p className="mt-1 text-2xl font-bold text-emerald-700">
            {formatCurrency(statement.totalEarnings)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Gastos a reembolsar</p>
          <p className="mt-1 text-2xl font-bold text-blue-700">
            {formatCurrency(statement.reimbursableExpenses)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Viaje {formatCurrency(statement.totalTripExpenses)} · Vehículo{" "}
            {formatCurrency(statement.totalVehicleExpenses)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">Anticipos</p>
          <p className="mt-1 text-2xl font-bold text-amber-700">
            {formatCurrency(statement.totalAdvances)}
          </p>
        </div>
        <div className="rounded-xl border p-4">
          <p className="text-sm text-muted-foreground">{payment.action}</p>
          <p className="mt-1 text-2xl font-bold">
            {formatCurrency(Math.abs(statement.netBalance))}
          </p>
        </div>
      </div>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Viajes pendientes</h2>
        {statement.tripRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin viajes cerrados pendientes de liquidar.
          </p>
        ) : (
          <ul className="space-y-2">
            {statement.tripRows.map((trip) => (
              <li key={trip.tripId} className="rounded-lg border p-3 text-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-medium">
                      {trip.origin} → {trip.destination}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Flete {formatCurrency(trip.freight)} · Sueldo{" "}
                      {statement.commissionPercent}%
                    </p>
                  </div>
                  <span className="font-semibold text-emerald-700">
                    {formatCurrency(trip.earnings)}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Gastos pendientes</h2>
        {statement.expenseRows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin gastos aprobados pendientes de liquidar.
          </p>
        ) : (
          <>
            <p className="text-xs text-muted-foreground">
              Incluye gastos de viaje y del vehículo. Todos los asume la empresa
              al liquidar.
            </p>
            <ul className="space-y-2">
              {statement.expenseRows.map((expense) => (
                <li key={expense.id} className="rounded-lg border p-3 text-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{expense.categoryName}</p>
                      <p className="text-xs text-muted-foreground">
                        {expense.scope === "vehicle"
                          ? `Gasto del vehículo${expense.vehicleLabel ? ` · ${expense.vehicleLabel}` : ""}`
                          : expense.tripLabel ?? "Gasto de viaje"}{" "}
                        · {new Date(expense.createdAt).toLocaleDateString("es-CO")}
                      </p>
                    </div>
                    <span className="font-semibold text-blue-700">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-sm font-medium">Anticipos pendientes</h2>
        {statement.advances.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Sin anticipos pendientes de liquidar.
          </p>
        ) : (
          <ul className="space-y-2">
            {statement.advances.map((advance) => (
              <li
                key={advance.id}
                className="flex items-center justify-between rounded-lg border p-3 text-sm"
              >
                <div>
                  <p className="font-medium">{formatCurrency(advance.amount)}</p>
                  <p className="text-xs text-muted-foreground">
                    {advance.status === "open" ? "Abierto" : "Liquidado"} ·{" "}
                    {new Date(advance.createdAt).toLocaleDateString("es-CO")}
                    {advance.deliveredByName
                      ? ` · Entregado por ${advance.deliveredByName}`
                      : ""}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <SettlementHistory settlements={statement.settlements} compact />
    </div>
  );
}
