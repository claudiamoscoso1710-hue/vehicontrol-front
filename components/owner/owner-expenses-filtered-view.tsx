"use client";

import { useMemo, useState } from "react";
import { OwnerExpenseFilterBar } from "@/components/owner/owner-expense-filter-bar";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import {
  countExpensesInGroups,
  EMPTY_OWNER_EXPENSE_FILTERS,
  filterExpensePeriodGroups,
  hasActiveOwnerExpenseFilters,
  type OwnerExpenseFilters,
} from "@/lib/expenses/filter-owner-expenses";
import type { ExpensePeriodGroup } from "@/lib/reports/load-expenses-by-period";

type VehicleOption = { id: string; plate: string };

type Props = {
  groups: ExpensePeriodGroup[];
  organizationId: string;
  tripCategories: { id: string; name: string }[];
  vehicleCategories: { id: string; name: string }[];
  vehicles: VehicleOption[];
};

export function OwnerExpensesFilteredView({
  groups,
  organizationId,
  tripCategories,
  vehicleCategories,
  vehicles,
}: Props) {
  const [filters, setFilters] = useState<OwnerExpenseFilters>(
    EMPTY_OWNER_EXPENSE_FILTERS
  );

  const totalCount = useMemo(() => countExpensesInGroups(groups), [groups]);

  const filteredGroups = useMemo(
    () => filterExpensePeriodGroups(groups, filters),
    [groups, filters]
  );

  const visibleCount = useMemo(
    () => countExpensesInGroups(filteredGroups),
    [filteredGroups]
  );

  const filteredTotal = useMemo(
    () =>
      filteredGroups.reduce(
        (sum, group) =>
          sum + group.expenses.reduce((rowSum, expense) => rowSum + expense.amount, 0),
        0
      ),
    [filteredGroups]
  );

  const filtersActive = hasActiveOwnerExpenseFilters(filters);

  return (
    <div className="space-y-4">
      <OwnerExpenseFilterBar
        filters={filters}
        onChange={setFilters}
        vehicles={vehicles}
        visibleCount={visibleCount}
        totalCount={totalCount}
        filteredTotal={filteredTotal}
      />

      <ExpensePeriodGroups
        groups={filteredGroups}
        variant="owner"
        canManageExpenses
        organizationId={organizationId}
        tripCategories={tripCategories}
        vehicleCategories={vehicleCategories}
        emptyCurrentMessage={
          filtersActive
            ? "Ningún gasto coincide con los filtros en el período vigente."
            : undefined
        }
        emptyHistoryMessage={
          filtersActive
            ? "Ningún gasto coincide con los filtros en períodos liquidados."
            : undefined
        }
      />
    </div>
  );
}
