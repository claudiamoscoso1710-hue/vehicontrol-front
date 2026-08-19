"use client";

import type { ExpenseRow } from "@/lib/reports/driver-account-statement";
import { getOthersExpenseDetail } from "@/lib/expenses/category-utils";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";

type Props = {
  expenses: ExpenseRow[];
  emptyMessage: string;
};

export function DriverVehicleExpenseList({ expenses, emptyMessage }: Props) {
  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-3">
      {expenses.map((expense) => (
        <li key={expense.id}>
          <DriverExpenseRow
            expenseId={expense.id}
            categoryName={expense.categoryName}
            categoryDetail={getOthersExpenseDetail(
              expense.categoryName,
              expense.notes
            )}
            amount={expense.amount}
            dateLabel={new Date(expense.createdAt).toLocaleDateString("es-CO")}
            subtitle={
              expense.vehicleLabel
                ? `Gasto del vehículo · ${expense.vehicleLabel}`
                : "Gasto del vehículo"
            }
            hasEvidence={expense.hasEvidence}
          />
        </li>
      ))}
    </ul>
  );
}
