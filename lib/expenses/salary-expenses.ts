/** Gastos del viaje que reducen la base del sueldo (excluye adicionales y gastos del vehículo). */
export function sumTripExpensesForSalary(
  expenses: ReadonlyArray<{
    amount: number | string;
    additional_trip_expense?: boolean | null;
  }>
): number {
  return expenses.reduce((sum, expense) => {
    if (expense.additional_trip_expense) return sum;
    return sum + Number(expense.amount ?? 0);
  }, 0);
}

/** Todos los gastos ligados a un viaje (reembolso / visualización). */
export function sumTripExpensesTotal(
  expenses: ReadonlyArray<{ amount: number | string }>
): number {
  return expenses.reduce((sum, expense) => sum + Number(expense.amount ?? 0), 0);
}
