"use client";

import { Fragment, useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getOthersExpenseDetail } from "@/lib/expenses/category-utils";
import { ExpenseScopeBadge } from "@/components/shared/expense-scope-badge";
import {
  getExpenseDisplayTitle,
  resolveExpenseScope,
} from "@/lib/expenses/expense-scope";
import type { SettlementSpreadsheetData } from "@/lib/reports/settlement-spreadsheet-types";
import { cn } from "@/lib/utils";

type Props = {
  data: SettlementSpreadsheetData;
  /** Muestra utilidad neta del carro (vista dueño en vehículo). */
  showVehicleNetMargin?: boolean;
};

function MoneyCell({
  value,
  tone = "neutral",
  className,
}: {
  value: number;
  tone?: "neutral" | "freight" | "expense" | "earning" | "vehicle" | "advance" | "freightHeld";
  className?: string;
}) {
  if (value === 0) {
    return (
      <td
        className={cn(
          "px-3 py-2.5 text-right tabular-nums text-muted-foreground/40",
          className
        )}
      >
        —
      </td>
    );
  }

  const toneClass =
    tone === "freight"
      ? "text-foreground"
      : tone === "expense"
        ? "text-blue-700"
        : tone === "earning"
          ? "text-emerald-700"
          : tone === "vehicle"
            ? "text-violet-700"
            : tone === "advance"
              ? "text-amber-700"
              : tone === "freightHeld"
                ? "text-orange-700"
                : "text-foreground";

  return (
    <td
      className={cn(
        "px-3 py-2.5 text-right tabular-nums font-medium",
        toneClass,
        className
      )}
    >
      {formatCurrency(value)}
    </td>
  );
}

const thClass =
  "px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-muted-foreground whitespace-nowrap";
const thRight = cn(thClass, "text-right");

export function SettlementSpreadsheetTable({
  data,
  showVehicleNetMargin = false,
}: Props) {
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

  function toggleTrip(tripId: string) {
    setExpandedTrips((current) => {
      const next = new Set(current);
      if (next.has(tripId)) next.delete(tripId);
      else next.add(tripId);
      return next;
    });
  }

  const hasRows =
    data.trips.length > 0 ||
    data.vehicleExpenses.length > 0 ||
    data.advances.length > 0;

  const netMargin = data.totals.netMargin;
  const marginPercent =
    data.totals.freight > 0
      ? Math.round((netMargin / data.totals.freight) * 100)
      : null;
  const isProfit = netMargin >= 0;

  if (!hasRows) {
    return (
      <p className="rounded-xl border bg-muted/20 px-4 py-6 text-sm text-muted-foreground">
        {data.emptyMessage ?? "Sin movimientos en este período."}
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1040px] border-collapse text-sm">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className={thClass}>Viaje / concepto</th>
              <th className={thRight}>Flete</th>
              <th className={thRight}>Gastos viaje</th>
              <th className={thRight}>Sueldo conductor</th>
              <th className={thRight}>Gastos carro</th>
              <th className={thRight}>Flete en mano</th>
              <th className={thRight}>Anticipos</th>
            </tr>
          </thead>
          <tbody>
            {data.trips.map((trip) => {
              const isOpen = expandedTrips.has(trip.id);
              const hasExpenses = trip.expenseItems.length > 0;
              const expenseTotalForCell = trip.tripExpensesForProfit;
              const hasPrepaidExcluded =
                !trip.isPending &&
                trip.tripExpensesForProfit !== trip.tripExpenses;

              return (
                <Fragment key={trip.id}>
                  <tr
                    className={cn(
                      "border-b border-border/60 hover:bg-muted/20",
                      trip.isPending && "bg-amber-50/40"
                    )}
                  >
                    <td className="px-3 py-2.5">
                      <div className="min-w-[180px]">
                        <p className="font-medium">{trip.label}</p>
                        {trip.sublabel ? (
                          <p className="text-xs text-muted-foreground">{trip.sublabel}</p>
                        ) : null}
                        {trip.isPending ? (
                          <p className="mt-0.5 text-xs font-medium text-amber-800">
                            Pendiente — no suma a utilidad hasta cerrar el viaje
                          </p>
                        ) : null}
                        {!trip.isPending && trip.freightHeld > 0 ? (
                          <p className="mt-0.5 text-xs font-medium text-orange-800">
                            Sin cliente — flete en mano del conductor
                          </p>
                        ) : null}
                      </div>
                    </td>
                    <MoneyCell
                      value={trip.freight}
                      tone={trip.isPending ? "neutral" : "freight"}
                      className={trip.isPending ? "text-muted-foreground" : undefined}
                    />
                    <td className="px-3 py-2.5 text-right">
                      {hasExpenses ? (
                        <button
                          type="button"
                          onClick={() => toggleTrip(trip.id)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 tabular-nums font-medium transition-colors",
                            trip.isPending
                              ? "text-muted-foreground hover:bg-muted/60"
                              : "text-blue-700 hover:bg-blue-50"
                          )}
                          aria-expanded={isOpen}
                        >
                          {formatCurrency(expenseTotalForCell)}
                          <ChevronDown
                            className={cn(
                              "h-3.5 w-3.5 transition-transform",
                              isOpen && "rotate-180"
                            )}
                          />
                        </button>
                      ) : (
                        <span className="tabular-nums text-muted-foreground/40">—</span>
                      )}
                      {hasPrepaidExcluded ? (
                        <p className="mt-0.5 text-[10px] text-muted-foreground">
                          {formatCurrency(trip.tripExpenses)} incl. anticipados
                        </p>
                      ) : null}
                    </td>
                    <MoneyCell
                      value={trip.driverSalary}
                      tone={trip.isPending ? "neutral" : "earning"}
                      className={trip.isPending ? "text-muted-foreground" : undefined}
                    />
                    <MoneyCell value={0} />
                    <MoneyCell
                      value={trip.freightHeld}
                      tone="freightHeld"
                    />
                    <MoneyCell value={0} />
                  </tr>

                  {isOpen && hasExpenses
                    ? trip.expenseItems.map((expense) => {
                        const scope = resolveExpenseScope({
                          tripId: trip.id,
                          additionalTripExpense: expense.additionalTripExpense,
                        });
                        const title = getExpenseDisplayTitle({
                          scope,
                          categoryName: expense.categoryName,
                          notes: expense.notes,
                        });
                        const detail =
                          scope === "additional"
                            ? null
                            : getOthersExpenseDetail(expense.categoryName, expense.notes);
                        const excludedFromProfit = Boolean(expense.ownerPrepaid);
                        return (
                          <tr
                            key={expense.id}
                            className={cn(
                              "border-b border-border/40 bg-blue-50/40",
                              excludedFromProfit && "opacity-80"
                            )}
                          >
                            <td className="px-3 py-2 pl-8 text-xs text-muted-foreground">
                              <span className="inline-flex flex-wrap items-center gap-1.5 font-medium text-foreground">
                                <ExpenseScopeBadge scope={scope} />
                                {title}
                                {excludedFromProfit ? (
                                  <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-900">
                                    Anticipado
                                  </span>
                                ) : null}
                                {detail ? (
                                  <span className="font-normal text-muted-foreground">
                                    · {detail}
                                  </span>
                                ) : null}
                              </span>
                              <span className="ml-2 text-muted-foreground">
                                {new Date(expense.createdAt).toLocaleDateString("es-CO")}
                              </span>
                              {excludedFromProfit ? (
                                <span className="ml-2 text-[10px] text-muted-foreground">
                                  · no resta utilidad
                                </span>
                              ) : null}
                            </td>
                            <td />
                            <td className="px-3 py-2 text-right tabular-nums text-sm text-blue-700">
                              {formatCurrency(expense.amount)}
                            </td>
                            <td colSpan={4} />
                          </tr>
                        );
                      })
                    : null}

                  {isOpen && !hasExpenses ? (
                    <tr className="border-b border-border/40 bg-muted/10">
                      <td colSpan={7} className="px-3 py-2 pl-8 text-xs text-muted-foreground">
                        Sin gastos en este viaje.
                      </td>
                    </tr>
                  ) : null}
                </Fragment>
              );
            })}

            {data.vehicleExpenses.map((expense) => {
              const detail = getOthersExpenseDetail(expense.categoryName, expense.notes);
              return (
                <tr
                  key={expense.id}
                  className="border-b border-border/60 hover:bg-muted/20"
                >
                  <td className="px-3 py-2.5">
                    <p className="flex flex-wrap items-center gap-1.5 font-medium">
                      <ExpenseScopeBadge scope="vehicle" />
                      {expense.categoryName}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Gasto del vehículo
                      {expense.vehicleLabel ? ` · ${expense.vehicleLabel}` : ""}
                      {detail ? ` · ${detail}` : ""}
                      {" · "}
                      {new Date(expense.createdAt).toLocaleDateString("es-CO")}
                    </p>
                  </td>
                  <MoneyCell value={0} />
                  <MoneyCell value={0} />
                  <MoneyCell value={0} />
                  <MoneyCell value={expense.amount} tone="vehicle" />
                  <MoneyCell value={0} />
                  <MoneyCell value={0} />
                </tr>
              );
            })}

            {data.advances.map((advance) => (
              <tr
                key={advance.id}
                className="border-b border-border/60 hover:bg-muted/20"
              >
                <td className="px-3 py-2.5">
                  <p className="font-medium">Anticipo</p>
                  <p className="text-xs text-muted-foreground">
                    {advance.status === "open" ? "Abierto" : "Liquidado"}
                    {" · "}
                    {new Date(advance.createdAt).toLocaleDateString("es-CO")}
                    {advance.deliveredByName
                      ? ` · Entregado por ${advance.deliveredByName}`
                      : ""}
                  </p>
                </td>
                <MoneyCell value={0} />
                <MoneyCell value={0} />
                <MoneyCell value={0} />
                <MoneyCell value={0} />
                <MoneyCell value={0} />
                <MoneyCell value={0} />
                <MoneyCell value={advance.amount} tone="advance" />
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="border-t-2 bg-muted/30 font-semibold">
              <td className="px-3 py-3">Total confirmado</td>
              <td className="px-3 py-3 text-right tabular-nums">
                {formatCurrency(data.totals.freight)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-blue-700">
                {formatCurrency(data.totals.tripExpenses)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-emerald-700">
                {formatCurrency(data.totals.driverSalary)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-violet-700">
                {formatCurrency(data.totals.vehicleExpenses)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-orange-700">
                {formatCurrency(data.totals.freightHeld)}
              </td>
              <td className="px-3 py-3 text-right tabular-nums text-amber-700">
                {formatCurrency(data.totals.advances)}
              </td>
            </tr>
            {data.totals.pendingFreight > 0 ||
            data.totals.pendingTripExpenses > 0 ||
            data.totals.pendingDriverSalary > 0 ? (
              <tr className="border-t bg-amber-50/50 text-sm">
                <td className="px-3 py-2.5 font-medium text-amber-900">
                  Pendiente (viajes en curso)
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(data.totals.pendingFreight)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(data.totals.pendingTripExpenses)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  {formatCurrency(data.totals.pendingDriverSalary)}
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  —
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  —
                </td>
                <td className="px-3 py-2.5 text-right tabular-nums text-muted-foreground">
                  —
                </td>
              </tr>
            ) : null}
            {showVehicleNetMargin ? (
              <tr
                className={cn(
                  "border-t-2 font-semibold",
                  isProfit ? "bg-emerald-50/80" : "bg-red-50/80"
                )}
              >
                <td className="px-3 py-3">
                  <p className="font-semibold text-foreground">
                    {isProfit ? "Utilidad del carro" : "Pérdida del carro"}
                  </p>
                  <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                    Fletes cerrados − gastos viaje − sueldo − gastos carro
                    {marginPercent !== null ? ` · ${marginPercent}% sobre fletes` : ""}
                  </p>
                </td>
                <td colSpan={6} className="px-3 py-3 text-right">
                  <p
                    className={cn(
                      "text-lg tabular-nums",
                      isProfit ? "text-emerald-700" : "text-red-700"
                    )}
                  >
                    {formatCurrency(netMargin)}
                  </p>
                  {data.totals.advances > 0 ? (
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                      Anticipos al conductor: {formatCurrency(data.totals.advances)}{" "}
                      (informativo, no restan utilidad)
                    </p>
                  ) : null}
                  {(data.totals.pendingFreight > 0 ||
                    data.totals.pendingTripExpenses > 0 ||
                    data.totals.pendingDriverSalary > 0) && (
                    <p className="mt-0.5 text-xs font-normal text-muted-foreground">
                      Viajes en curso pendientes: flete{" "}
                      {formatCurrency(data.totals.pendingFreight)} · gastos{" "}
                      {formatCurrency(data.totals.pendingTripExpenses)} · sueldo est.{" "}
                      {formatCurrency(data.totals.pendingDriverSalary)}
                    </p>
                  )}
                </td>
              </tr>
            ) : null}
          </tfoot>
        </table>
      </div>

      {data.footerNote ? (
        <p className="border-t px-4 py-2 text-xs text-muted-foreground">
          {data.footerNote}
        </p>
      ) : null}
    </div>
  );
}
