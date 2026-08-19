export type ExpenseScope = "trip" | "vehicle" | "additional";

export type ExpenseCategoryScope = "trip" | "vehicle";

export const EXPENSE_SCOPE_META: Record<
  ExpenseScope,
  { label: string; badgeClass: string }
> = {
  trip: {
    label: "Viaje",
    badgeClass: "bg-sky-100 text-sky-800",
  },
  vehicle: {
    label: "Vehículo",
    badgeClass: "bg-violet-100 text-violet-800",
  },
  additional: {
    label: "Adicional",
    badgeClass: "bg-amber-100 text-amber-900",
  },
};

export function resolveExpenseScope(input: {
  tripId?: string | null;
  trip_id?: string | null;
  additionalTripExpense?: boolean | null;
  additional_trip_expense?: boolean | null;
}): ExpenseScope {
  if (input.additionalTripExpense || input.additional_trip_expense) {
    return "additional";
  }
  if (input.tripId || input.trip_id) {
    return "trip";
  }
  return "vehicle";
}

/** Texto principal para gastos adicionales (solo descripción libre en notes). */
export function getAdditionalExpenseDescription(
  notes: string | null | undefined
): string {
  const trimmed = notes?.trim();
  if (!trimmed) return "Gasto adicional";
  return trimmed.split(" — ")[0]?.trim() || "Gasto adicional";
}

export function getExpenseDisplayTitle(params: {
  scope: ExpenseScope;
  categoryName?: string | null;
  notes?: string | null;
}): string {
  if (params.scope === "additional") {
    return getAdditionalExpenseDescription(params.notes);
  }
  return params.categoryName?.trim() || "Gasto";
}

export function filterCategoriesByScope<
  T extends { name: string; scope?: ExpenseCategoryScope | string | null },
>(categories: T[], scope: ExpenseCategoryScope): T[] {
  return categories.filter((category) => (category.scope ?? "trip") === scope);
}
