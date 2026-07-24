import {
  calculateTripEarnings,
  getEffectiveCommissionPercent,
  type DriverCompensationConfig,
} from "@/lib/settings/driver-compensation";

/** Sueldo del conductor que asume el dueño (% del flete en vista owner). */
export function calculateOwnerTripDriverSalary(
  freightValue: number,
  approvedExpenseTotal: number,
  commissionPercent: number
): number {
  if (freightValue <= 0 || commissionPercent <= 0) return 0;

  return calculateTripEarnings(
    freightValue,
    approvedExpenseTotal,
    commissionPercent,
    "before_expenses"
  );
}

export function calculateOwnerTripTotalCosts(
  approvedExpenseTotal: number,
  driverSalary: number
): number {
  return approvedExpenseTotal + driverSalary;
}

export function resolveTripCommissionPercent(
  orgConfig: DriverCompensationConfig,
  driverCommissionPercent: number | null | undefined
): number {
  return getEffectiveCommissionPercent(orgConfig, driverCommissionPercent ?? null);
}
