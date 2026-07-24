"use client";

import { useState } from "react";
import { ChevronDown, Route } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import type { ExpensePeriodGroup } from "@/lib/reports/load-expenses-by-period";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
} from "@/components/driver/driver-ui";
import { cn } from "@/lib/utils";

type TripExpense = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  hasEvidence: boolean;
  expense_categories: { name: string } | { name: string }[] | null;
};

type Trip = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freight_value: number | null;
  created_at: string;
  expenses: TripExpense[];
};

type Props = {
  driverName: string;
  trips: Trip[];
  expenseGroups: ExpensePeriodGroup[];
  totalExpenseCount: number;
};

function getCategory(
  expense: TripExpense
): { name: string } | null {
  const c = expense.expense_categories;
  return Array.isArray(c) ? c[0] : c;
}

export function DriverHistoryTabs({
  driverName,
  trips,
  expenseGroups,
  totalExpenseCount,
}: Props) {
  const [tab, setTab] = useState<"trips" | "expenses">("trips");
  const [expandedTrips, setExpandedTrips] = useState<Set<string>>(new Set());

  function toggleTrip(tripId: string) {
    setExpandedTrips((current) => {
      const next = new Set(current);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  }

  return (
    <DriverPageContainer>
      <DriverPageHeader
        eyebrow="Actividad"
        title="Historial"
        subtitle={driverName}
      />

      <div className="grid grid-cols-2 gap-2 rounded-2xl bg-muted/60 p-1">
        {(
          [
            { key: "trips" as const, label: "Viajes", count: trips.length },
            {
              key: "expenses" as const,
              label: "Gastos",
              count: totalExpenseCount,
            },
          ] as const
        ).map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => setTab(item.key)}
            className={cn(
              "min-h-11 rounded-xl px-3 py-2.5 text-sm font-semibold transition-all active:scale-[0.98]",
              tab === item.key
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground"
            )}
          >
            {item.label}
            <span className="ml-1.5 text-xs opacity-60">({item.count})</span>
          </button>
        ))}
      </div>

      {tab === "trips" ? (
        <section className="space-y-3">
          {trips.length === 0 ? (
            <DriverEmptyState
              icon={Route}
              title="Sin viajes aún"
              description="Cuando registres tu primer viaje aparecerá aquí."
            />
          ) : (
            trips.map((trip) => {
              const isOpen = expandedTrips.has(trip.id);
              const hasExpenses = trip.expenses.length > 0;

              return (
                <article
                  key={trip.id}
                  className="overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => toggleTrip(trip.id)}
                    className="flex w-full items-start gap-3 p-4 text-left active:bg-muted/30"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-semibold">
                        {trip.origin} → {trip.destination}
                      </p>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {new Date(trip.created_at).toLocaleDateString("es-CO", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {hasExpenses
                          ? ` · ${trip.expenses.length} gasto${trip.expenses.length === 1 ? "" : "s"}`
                          : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <StatusBadge status={trip.status} />
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-muted-foreground transition-transform",
                          isOpen && "rotate-180"
                        )}
                      />
                    </div>
                  </button>

                  <div className="flex items-center justify-between border-t border-border/50 px-4 py-2.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      Flete
                    </span>
                    <span className="text-sm font-bold">
                      {formatCurrency(Number(trip.freight_value ?? 0))}
                    </span>
                  </div>

                  {isOpen && hasExpenses ? (
                    <ul className="space-y-2 border-t border-border/50 bg-muted/20 px-4 py-3">
                      {trip.expenses.map((expense) => (
                        <li key={expense.id}>
                          <DriverExpenseRow
                            expenseId={expense.id}
                            categoryName={getCategory(expense)?.name ?? "Gasto"}
                            amount={Number(expense.amount)}
                            dateLabel={new Date(expense.created_at).toLocaleDateString(
                              "es-CO"
                            )}
                            hasEvidence={expense.hasEvidence}
                          />
                        </li>
                      ))}
                    </ul>
                  ) : null}

                  {isOpen && !hasExpenses ? (
                    <p className="border-t border-border/50 px-4 py-3 text-xs text-muted-foreground">
                      Sin gastos en este viaje.
                    </p>
                  ) : null}
                </article>
              );
            })
          )}
        </section>
      ) : (
        <ExpensePeriodGroups
          groups={expenseGroups}
          variant="driver"
          emptyCurrentMessage="No tienes gastos pendientes de liquidar en el período vigente."
          emptyHistoryMessage="Cuando liquide tu empresa, los gastos aparecerán aquí por período."
        />
      )}
    </DriverPageContainer>
  );
}
