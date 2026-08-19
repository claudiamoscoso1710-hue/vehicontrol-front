"use client";

import { CalendarRange, History } from "lucide-react";
import { ExpenseReviewList } from "@/components/owner/expense-review-list";
import { OwnerManageExpenseList } from "@/components/owner/owner-manage-expense-list";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
import {
  getExpenseDisplayTitle,
  resolveExpenseScope,
} from "@/lib/expenses/expense-scope";
import { getOthersExpenseDetail } from "@/lib/expenses/category-utils";
import { formatCurrency } from "@/lib/format";
import type { ExpensePeriodGroup } from "@/lib/reports/load-expenses-by-period";

type Props = {
  groups: ExpensePeriodGroup[];
  variant?: "owner" | "driver";
  emptyCurrentMessage?: string;
  emptyHistoryMessage?: string;
  canManageExpenses?: boolean;
  organizationId?: string;
  tripCategories?: { id: string; name: string }[];
  vehicleCategories?: { id: string; name: string }[];
};

export function ExpensePeriodGroups({
  groups,
  variant = "owner",
  emptyCurrentMessage = "No hay gastos en el período vigente.",
  emptyHistoryMessage = "Aún no hay gastos en períodos liquidados.",
  canManageExpenses = false,
  organizationId,
  tripCategories = [],
  vehicleCategories = [],
}: Props) {
  const currentGroup = groups.find((group) => group.isCurrent);
  const historyGroups = groups.filter((group) => !group.isCurrent);

  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <div className="flex items-start gap-3 rounded-xl border border-brand/20 bg-brand/5 p-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <CalendarRange className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">
              {variant === "driver" ? "Período actual" : "Pendientes de liquidar"}
            </p>
            <p className="text-sm text-muted-foreground">
              {currentGroup?.rangeLabel ?? "Sin movimientos pendientes de liquidar"}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {variant === "driver"
                ? "Desde tu primer viaje, gasto o anticipo hasta que la empresa liquide. No sigue el mes calendario."
                : "Gastos sin liquidar. Cada conductor cierra su período al liquidar, no por mes."}
            </p>
          </div>
          {currentGroup ? (
            <div className="text-right">
              <p className="text-lg font-bold">{formatCurrency(currentGroup.total)}</p>
              <p className="text-xs text-muted-foreground">
                {currentGroup.expenses.length} gasto
                {currentGroup.expenses.length === 1 ? "" : "s"}
              </p>
            </div>
          ) : null}
        </div>

        {currentGroup && currentGroup.expenses.length > 0 ? (
          variant === "owner" ? (
            canManageExpenses && organizationId ? (
              <OwnerManageExpenseList
                organizationId={organizationId}
                categories={[...tripCategories, ...vehicleCategories]}
                expenses={currentGroup.expenses.map(toOwnerExpense)}
                showSettlementStatus={false}
              />
            ) : (
              <ExpenseReviewList
                expenses={currentGroup.expenses.map(toOwnerExpense)}
                showSettlementStatus={false}
              />
            )
          ) : (
            <DriverExpensePeriodList expenses={currentGroup.expenses} />
          )
        ) : (
          <p className="text-sm text-muted-foreground">{emptyCurrentMessage}</p>
        )}
      </section>

      <section className="space-y-3">
        <div className="flex items-center gap-2">
          <History className="h-4 w-4 text-muted-foreground" />
          <h2 className="text-sm font-semibold">Historial por períodos liquidados</h2>
        </div>

        {historyGroups.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyHistoryMessage}</p>
        ) : (
          <div className="space-y-3">
            {historyGroups.map((group) => (
              <details
                key={group.id}
                className="group overflow-hidden rounded-xl border bg-card shadow-sm"
              >
                <summary className="flex cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:content-none">
                  <div className="min-w-0">
                    <p className="font-medium">{group.title}</p>
                    <p className="text-sm text-muted-foreground">{group.rangeLabel}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-semibold">{formatCurrency(group.total)}</p>
                    <p className="text-xs text-muted-foreground">
                      {group.expenses.length} gasto
                      {group.expenses.length === 1 ? "" : "s"}
                    </p>
                  </div>
                </summary>
                <div className="border-t bg-muted/10 px-4 py-3">
                  {variant === "owner" ? (
                    <ExpenseReviewList
                      expenses={group.expenses.map(toOwnerExpense)}
                      showSettlementStatus={false}
                    />
                  ) : (
                    <DriverExpensePeriodList expenses={group.expenses} />
                  )}
                </div>
              </details>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function toOwnerExpense(expense: ExpensePeriodGroup["expenses"][number]) {
  return {
    id: expense.id,
    amount: expense.amount,
    status: expense.status,
    notes: expense.notes,
    owner_prepaid: expense.owner_prepaid,
    additional_trip_expense: expense.additional_trip_expense,
    category_id: expense.category_id,
    created_at: expense.created_at,
    trip_id: expense.trip_id,
    settlement_id: expense.settlement_id,
    tripLabel: expense.tripLabel,
    vehiclePlate: expense.vehiclePlate,
    expense_categories: { name: expense.categoryName },
    drivers: expense.driverName ? { full_name: expense.driverName } : null,
    hasEvidence: expense.hasEvidence,
  };
}

function DriverExpensePeriodList({
  expenses,
}: {
  expenses: ExpensePeriodGroup["expenses"];
}) {
  if (expenses.length === 0) {
    return null;
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => {
        const scope = resolveExpenseScope({
          tripId: expense.trip_id,
          additionalTripExpense: expense.additional_trip_expense,
        });
        const displayTitle = getExpenseDisplayTitle({
          scope,
          categoryName: expense.categoryName,
          notes: expense.notes,
        });
        const scopeLabel =
          scope === "vehicle"
            ? `Gasto del vehículo${expense.vehiclePlate ? ` · ${expense.vehiclePlate}` : ""}`
            : expense.tripLabel ?? "Gasto de viaje";
        const categoryDetail =
          scope === "additional"
            ? null
            : getOthersExpenseDetail(expense.categoryName, expense.notes);
        const subtitleParts = [scopeLabel];
        if (expense.notes && scope !== "additional" && !categoryDetail) {
          subtitleParts.push(expense.notes);
        }

        return (
          <li key={expense.id}>
            <DriverExpenseRow
              expenseId={expense.id}
              categoryName={displayTitle}
              categoryDetail={categoryDetail}
              amount={expense.amount}
              dateLabel={new Date(expense.created_at).toLocaleDateString("es-CO")}
              subtitle={subtitleParts.join(" · ")}
              ownerPrepaid={expense.owner_prepaid}
              expenseScope={scope}
              tripId={expense.trip_id}
              additionalTripExpense={expense.additional_trip_expense}
              hasEvidence={expense.hasEvidence}
            />
          </li>
        );
      })}
    </ul>
  );
}
