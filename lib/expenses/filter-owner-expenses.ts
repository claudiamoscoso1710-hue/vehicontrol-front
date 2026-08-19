import type { ExpensePeriodGroup } from "@/lib/reports/load-expenses-by-period";
import { resolveExpenseScope, type ExpenseScope } from "@/lib/expenses/expense-scope";

export type ExpenseScopeFilter = "all" | ExpenseScope;

export type OwnerExpenseFilters = {
  dateFrom: string;
  dateTo: string;
  scopeType: ExpenseScopeFilter;
  vehicleId: string;
};

export const EMPTY_OWNER_EXPENSE_FILTERS: OwnerExpenseFilters = {
  dateFrom: "",
  dateTo: "",
  scopeType: "all",
  vehicleId: "",
};

function parseLocalDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function expenseLocalDate(createdAt: string): Date {
  const iso = createdAt.includes("T")
    ? createdAt
    : `${createdAt}T12:00:00`;
  const parsed = new Date(iso);
  return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
}

export function getExpenseScopeFilter(
  expense: Pick<
    ExpensePeriodGroup["expenses"][number],
    "trip_id" | "additional_trip_expense"
  >
): ExpenseScope {
  return resolveExpenseScope({
    tripId: expense.trip_id,
    additionalTripExpense: expense.additional_trip_expense,
  });
}

export function matchesOwnerExpenseFilters(
  expense: ExpensePeriodGroup["expenses"][number],
  filters: OwnerExpenseFilters
): boolean {
  const from = parseLocalDate(filters.dateFrom);
  const to = parseLocalDate(filters.dateTo);
  const expenseDate = expenseLocalDate(expense.created_at);

  if (from && expenseDate < from) return false;
  if (to && expenseDate > to) return false;

  if (filters.scopeType !== "all") {
    if (getExpenseScopeFilter(expense) !== filters.scopeType) return false;
  }

  if (filters.vehicleId && expense.vehicle_id !== filters.vehicleId) {
    return false;
  }

  return true;
}

export function hasActiveOwnerExpenseFilters(
  filters: OwnerExpenseFilters
): boolean {
  return Boolean(
    filters.dateFrom ||
      filters.dateTo ||
      filters.scopeType !== "all" ||
      filters.vehicleId
  );
}

export function filterExpensePeriodGroups(
  groups: ExpensePeriodGroup[],
  filters: OwnerExpenseFilters
): ExpensePeriodGroup[] {
  if (!hasActiveOwnerExpenseFilters(filters)) {
    return groups;
  }

  return groups
    .map((group) => {
      const expenses = group.expenses.filter((expense) =>
        matchesOwnerExpenseFilters(expense, filters)
      );
      return {
        ...group,
        expenses,
        total: expenses.reduce((sum, row) => sum + row.amount, 0),
      };
    })
    .filter((group) => group.isCurrent || group.expenses.length > 0);
}

export function countExpensesInGroups(groups: ExpensePeriodGroup[]): number {
  return groups.reduce((sum, group) => sum + group.expenses.length, 0);
}
