/** Viaje cerrado: flete y costos entran a la utilidad confirmada. */
export function isConfirmedTrip(status: string): boolean {
  return status === "closed";
}

/** Gastos que la empresa pagó directo (anticipado) no restan utilidad del carro. */
export function expenseCountsForVehicleProfit(expense: {
  owner_prepaid?: boolean | null;
}): boolean {
  return !expense.owner_prepaid;
}

export function sumTripExpensesForVehicleProfit(
  expenses: ReadonlyArray<{
    amount: number | string;
    owner_prepaid?: boolean | null;
  }>
): number {
  return expenses.reduce((sum, expense) => {
    if (!expenseCountsForVehicleProfit(expense)) return sum;
    return sum + Number(expense.amount ?? 0);
  }, 0);
}
