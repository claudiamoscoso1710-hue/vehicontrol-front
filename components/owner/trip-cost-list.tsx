"use client";

import { Wallet } from "lucide-react";
import { ExpenseReviewList } from "@/components/owner/expense-review-list";
import { formatCurrency } from "@/lib/format";

type Expense = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  trip_id?: string | null;
  settlement_id?: string | null;
  tripLabel?: string | null;
  vehiclePlate?: string | null;
  expense_categories: { name: string } | { name: string }[] | null;
  drivers: { full_name: string } | { full_name: string }[] | null;
  hasEvidence?: boolean;
};

type Props = {
  expenses: Expense[];
  driverName?: string | null;
  commissionPercent?: number;
  driverSalary?: number;
  salaryEstimated?: boolean;
  emptyMessage?: string;
};

export function TripCostList({
  expenses,
  driverName,
  commissionPercent = 0,
  driverSalary = 0,
  salaryEstimated = false,
  emptyMessage = "Sin otros gastos en este viaje.",
}: Props) {
  const hasSalary = driverSalary > 0;
  const hasExpenses = expenses.length > 0;

  if (!hasSalary && !hasExpenses) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="space-y-2">
      {hasSalary ? (
        <div className="overflow-hidden rounded-xl border border-violet-200/80 bg-violet-50/50">
          <div className="flex items-center gap-3 p-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Wallet className="h-4 w-4" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">Sueldo del conductor</p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {driverName ?? "Conductor"} · {commissionPercent}% del flete
                {salaryEstimated ? " · estimado" : ""}
              </p>
            </div>
            <p className="shrink-0 text-sm font-bold tabular-nums text-violet-800">
              {formatCurrency(driverSalary)}
            </p>
          </div>
        </div>
      ) : null}

      {hasExpenses ? (
        <ExpenseReviewList expenses={expenses} emptyMessage={emptyMessage} />
      ) : null}
    </div>
  );
}

export function tripCostTotal(
  expenses: { amount: number }[],
  driverSalary = 0
): number {
  const expenseTotal = expenses.reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  return expenseTotal + driverSalary;
}
