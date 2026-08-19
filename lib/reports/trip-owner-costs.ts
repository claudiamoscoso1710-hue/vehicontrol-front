import {
  calculateTripEarnings,
  getEffectiveCommissionPercent,
  type DriverCompensationConfig,
} from "@/lib/settings/driver-compensation";

/** Sueldo del conductor que asume el dueño (% del flete en vista owner). */
export function calculateOwnerTripDriverSalary(
  freightValue: number,
  approvedTripExpenseTotal: number,
  commissionPercent: number,
  salaryBasis: DriverCompensationConfig["salary_basis"]
): number {
  if (freightValue <= 0 || commissionPercent <= 0) return 0;

  return calculateTripEarnings(
    freightValue,
    approvedTripExpenseTotal,
    commissionPercent,
    salaryBasis
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
