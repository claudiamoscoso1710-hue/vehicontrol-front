"use client";

import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
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
  emptyMessage?: string;
  showSettlementStatus?: boolean;
};

export function ExpenseReviewList({
  expenses,
  emptyMessage = "No hay gastos.",
  showSettlementStatus = true,
}: Props) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => {
        const category = Array.isArray(expense.expense_categories)
          ? expense.expense_categories[0]
          : expense.expense_categories;
        const driver = Array.isArray(expense.drivers)
          ? expense.drivers[0]
          : expense.drivers;
        const isVehicleExpense = !expense.trip_id;
        const scopeLabel = isVehicleExpense
          ? `Gasto del vehículo${expense.vehiclePlate ? ` · ${expense.vehiclePlate}` : ""}`
          : expense.tripLabel ?? "Gasto de viaje";
        const settlementLabel = expense.settlement_id
          ? "Liquidado"
          : "Pendiente de liquidar";
        const statusSuffix = showSettlementStatus ? ` · ${settlementLabel}` : "";

        return (
          <li key={expense.id}>
            <DriverExpenseRow
              expenseId={expense.id}
              categoryName={category?.name ?? "Sin categoría"}
              amount={Number(expense.amount)}
              dateLabel={new Date(expense.created_at).toLocaleDateString("es-CO")}
              subtitle={`${driver?.full_name ?? "Conductor"} · ${scopeLabel}${statusSuffix}${
                expense.notes ? ` · ${expense.notes}` : ""
              }`}
              hasEvidence={expense.hasEvidence}
            />
          </li>
        );
      })}
    </ul>
  );
}

export function expenseListTotal(expenses: { amount: number }[]): number {
  return expenses.reduce((sum, row) => sum + Number(row.amount), 0);
}

export function formatExpenseListTotal(expenses: { amount: number }[]): string {
  return formatCurrency(expenseListTotal(expenses));
}
