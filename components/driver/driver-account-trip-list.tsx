"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import type { TripEarningRow } from "@/lib/reports/driver-account-statement";
import { getOthersExpenseDetail } from "@/lib/expenses/category-utils";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
import { cn } from "@/lib/utils";

type Props = {
  trips: TripEarningRow[];
  commissionPercent: number;
  emptyMessage: string;
};

export function DriverAccountTripList({
  trips,
  commissionPercent,
  emptyMessage,
}: Props) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  function toggleTrip(tripId: string) {
    setExpanded((current) => {
      const next = new Set(current);
      if (next.has(tripId)) {
        next.delete(tripId);
      } else {
        next.add(tripId);
      }
      return next;
    });
  }

  if (trips.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {trips.map((trip) => {
        const isOpen = expanded.has(trip.tripId);
        const hasExpenses = trip.expenseItems.length > 0;

        return (
          <li
            key={trip.tripId}
            className="overflow-hidden rounded-2xl border border-border/60 bg-muted/20"
          >
            <button
              type="button"
              onClick={() => toggleTrip(trip.tripId)}
              className="flex w-full items-start gap-3 p-3 text-left active:bg-muted/40"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate font-semibold">
                  {trip.origin} → {trip.destination}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Flete {formatCurrency(trip.freight)} · Sueldo {commissionPercent}%
                  {hasExpenses
                    ? ` · ${trip.expenseItems.length} gasto${trip.expenseItems.length === 1 ? "" : "s"}`
                    : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <p className="text-sm font-bold tabular-nums text-emerald-700">
                  +{formatCurrency(trip.earnings)}
                </p>
                <ChevronDown
                  className={cn(
                    "h-4 w-4 text-muted-foreground transition-transform",
                    isOpen && "rotate-180"
                  )}
                />
              </div>
            </button>

            {isOpen && hasExpenses ? (
              <ul className="space-y-2 border-t border-border/50 bg-card/50 px-3 py-3">
                {trip.expenseItems.map((expense) => (
                  <li key={expense.id}>
                    <DriverExpenseRow
                      expenseId={expense.id}
                      categoryName={expense.categoryName}
                      categoryDetail={getOthersExpenseDetail(
                        expense.categoryName,
                        expense.notes
                      )}
                      amount={expense.amount}
                      dateLabel={new Date(expense.createdAt).toLocaleDateString(
                        "es-CO"
                      )}
                      hasEvidence={expense.hasEvidence}
                    />
                  </li>
                ))}
              </ul>
            ) : null}

            {isOpen && !hasExpenses ? (
              <p className="border-t border-border/50 px-3 py-3 text-xs text-muted-foreground">
                Sin gastos en este viaje.
              </p>
            ) : null}
          </li>
        );
      })}
    </ul>
  );
}
