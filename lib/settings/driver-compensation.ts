export type SalaryBasis = "before_expenses" | "after_expenses";

export type DriverCompensationConfig = {
  salary_basis: SalaryBasis;
  commission_percent: number;
};

export const DRIVER_COMPENSATION_SETTING_KEY = "driver_compensation";

export const DEFAULT_DRIVER_COMPENSATION: DriverCompensationConfig = {
  salary_basis: "after_expenses",
  commission_percent: 25,
};

export function parseDriverCompensationConfig(
  value: unknown
): DriverCompensationConfig {
  if (!value || typeof value !== "object") {
    return DEFAULT_DRIVER_COMPENSATION;
  }

  const raw = value as Record<string, unknown>;
  const salaryBasis =
    raw.salary_basis === "before_expenses" ? "before_expenses" : "after_expenses";
  const commission = Number(raw.commission_percent);

  return {
    salary_basis: salaryBasis,
    commission_percent:
      Number.isFinite(commission) && commission >= 0 && commission <= 100
        ? commission
        : DEFAULT_DRIVER_COMPENSATION.commission_percent,
  };
}

export function getDriverSalaryLabel(commissionPercent: number): string {
  return `${commissionPercent}% del flete de cada viaje cerrado`;
}

export function getSalaryBasisLabel(basis: SalaryBasis): string {
  return basis === "before_expenses"
    ? "Antes de gastos (sobre el flete)"
    : "Después de gastos (flete − gastos del viaje)";
}

export function getEffectiveCommissionPercent(
  orgConfig: DriverCompensationConfig,
  driverCommissionPercent: number | null
): number {
  if (
    driverCommissionPercent != null &&
    Number.isFinite(Number(driverCommissionPercent))
  ) {
    return Number(driverCommissionPercent);
  }
  return orgConfig.commission_percent;
}

export function calculateTripEarnings(
  freight: number,
  expenses: number,
  commissionPercent: number,
  salaryBasis: SalaryBasis
): number {
  const base =
    salaryBasis === "before_expenses" ? freight : Math.max(freight - expenses, 0);
  return Math.round((base * commissionPercent) / 100);
}
