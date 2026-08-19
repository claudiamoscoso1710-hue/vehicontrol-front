export function computeMonthlyVehicleBilling(
  activeVehicleCount: number,
  pricePerVehicle: number
) {
  return activeVehicleCount * pricePerVehicle;
}

export function formatBillingBreakdown(
  activeVehicleCount: number,
  pricePerVehicle: number,
  formatCurrency: (value: number) => string
) {
  const total = computeMonthlyVehicleBilling(activeVehicleCount, pricePerVehicle);
  if (activeVehicleCount === 0) {
    return `0 camiones · ${formatCurrency(0)}/mes`;
  }
  return `${activeVehicleCount} camión${activeVehicleCount === 1 ? "" : "es"} × ${formatCurrency(pricePerVehicle)} = ${formatCurrency(total)}/mes`;
}
