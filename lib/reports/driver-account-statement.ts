import {
  calculateTripEarnings,
  getDriverSalaryLabel,
  getEffectiveCommissionPercent,
  getSalaryBasisLabel,
  type DriverCompensationConfig,
  type SalaryBasis,
} from "@/lib/settings/driver-compensation";
import type { SettlementPeriodOption } from "@/lib/reports/settlement-period";
import {
  driverHoldsFreight,
  freightHeldFromTrip,
} from "@/lib/reports/driver-held-freight";

export type TripEarningRow = {
  tripId: string;
  origin: string;
  destination: string;
  closedAt: string | null;
  freight: number;
  expenses: number;
  earnings: number;
  expenseItems: ExpenseRow[];
  driverHoldsFreight: boolean;
  freightHeld: number;
};

export type AdvanceRow = {
  id: string;
  amount: number;
  status: string;
  createdAt: string;
  tripId: string | null;
  deliveredByName: string | null;
};

export type ExpenseRow = {
  id: string;
  amount: number;
  createdAt: string;
  notes: string | null;
  categoryName: string;
  tripLabel: string | null;
  vehicleLabel: string | null;
  scope: "trip" | "vehicle";
  hasEvidence: boolean;
  additionalTripExpense?: boolean;
};

export type SettlementHistoryRow = {
  id: string;
  periodLabel: string;
  settledAt: string;
  totalEarnings: number;
  totalExpenses: number;
  totalAdvances: number;
  netBalance: number;
  paymentAmount: number;
  tripCount: number;
  tripExpenseCount: number;
  vehicleExpenseCount: number;
};

export type DriverAccountStatement = {
  periodId: string;
  isCurrentPeriod: boolean;
  periodStart: string;
  periodEnd: string | null;
  periodRangeLabel: string;
  periodOptions: SettlementPeriodOption[];
  periodLabel: string;
  salaryBasis: SalaryBasis;
  salaryBasisLabel: string;
  driverSalaryLabel: string;
  commissionPercent: number;
  tripRows: TripEarningRow[];
  expenseRows: ExpenseRow[];
  tripExpenseRows: ExpenseRow[];
  vehicleExpenseRows: ExpenseRow[];
  totalEarnings: number;
  totalExpenses: number;
  totalTripExpenses: number;
  totalVehicleExpenses: number;
  reimbursableExpenses: number;
  ownerAssumedExpenses: number;
  advances: AdvanceRow[];
  totalAdvances: number;
  totalFreightHeld: number;
  netBalance: number;
  hasPendingItems: boolean;
  settlements: SettlementHistoryRow[];
};

type TripInput = {
  id: string;
  origin: string;
  destination: string;
  closed_at: string | null;
  freight_value: number | null;
  client_id?: string | null;
};

type TripExpenseInput = {
  trip_id: string;
  amount: number;
  additional_trip_expense?: boolean;
};

type DriverExpenseInput = {
  id: string;
  amount: number;
  created_at: string;
  notes: string | null;
  trip_id: string | null;
  category_name: string;
  trip_origin: string | null;
  trip_destination: string | null;
  vehicle_plate: string | null;
  has_evidence: boolean;
  additional_trip_expense?: boolean;
};

type AdvanceInput = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  trip_id: string | null;
  delivered_by_name?: string | null;
};

type SettlementInput = {
  id: string;
  period_start: string;
  period_end: string;
  total_earnings: number;
  total_expenses: number;
  total_advances: number;
  net_balance: number;
  payment_amount: number;
  settled_at: string;
  trip_count?: number;
  trip_expense_count?: number;
  vehicle_expense_count?: number;
};

export function buildDriverAccountStatement(params: {
  periodId: string;
  isCurrentPeriod: boolean;
  periodStart: string;
  periodEnd: string | null;
  periodRangeLabel: string;
  periodOptions: SettlementPeriodOption[];
  periodLabel: string;
  orgConfig: DriverCompensationConfig;
  driverCommissionPercent: number | null;
  trips: TripInput[];
  tripExpenses: TripExpenseInput[];
  driverExpenses: DriverExpenseInput[];
  advances: AdvanceInput[];
  settlements?: SettlementInput[];
}): DriverAccountStatement {
  const commissionPercent = getEffectiveCommissionPercent(
    params.orgConfig,
    params.driverCommissionPercent
  );

  const expensesByTripForSalary = new Map<string, number>();
  const expensesByTripTotal = new Map<string, number>();
  for (const expense of params.tripExpenses) {
    if (!expense.trip_id) continue;
    const amount = Number(expense.amount);
    expensesByTripTotal.set(
      expense.trip_id,
      (expensesByTripTotal.get(expense.trip_id) ?? 0) + amount
    );
    if (!expense.additional_trip_expense) {
      expensesByTripForSalary.set(
        expense.trip_id,
        (expensesByTripForSalary.get(expense.trip_id) ?? 0) + amount
      );
    }
  }

  const expenseRows: ExpenseRow[] = params.driverExpenses.map((expense) => {
    const tripLabel =
      expense.trip_origin && expense.trip_destination
        ? `${expense.trip_origin} → ${expense.trip_destination}`
        : null;

    return {
      id: expense.id,
      amount: Number(expense.amount),
      createdAt: expense.created_at,
      notes: expense.notes,
      categoryName: expense.category_name,
      tripLabel,
      vehicleLabel: expense.vehicle_plate,
      scope: expense.trip_id ? "trip" : "vehicle",
      hasEvidence: expense.has_evidence,
      additionalTripExpense: Boolean(expense.additional_trip_expense),
    };
  });

  const tripExpenseRows = expenseRows.filter((row) => row.scope === "trip");
  const vehicleExpenseRows = expenseRows.filter((row) => row.scope === "vehicle");

  const expensesByTripId = new Map<string, ExpenseRow[]>();
  for (const row of expenseRows) {
    const trip = params.driverExpenses.find((item) => item.id === row.id);
    if (!trip?.trip_id) continue;
    const current = expensesByTripId.get(trip.trip_id) ?? [];
    current.push(row);
    expensesByTripId.set(trip.trip_id, current);
  }

  const tripRows: TripEarningRow[] = params.trips.map((trip) => {
    const freight = Number(trip.freight_value ?? 0);
    const expenses = expensesByTripTotal.get(trip.id) ?? 0;
    const salaryExpenses = expensesByTripForSalary.get(trip.id) ?? 0;
    const earnings = calculateTripEarnings(
      freight,
      salaryExpenses,
      commissionPercent,
      params.orgConfig.salary_basis
    );

    return {
      tripId: trip.id,
      origin: trip.origin,
      destination: trip.destination,
      closedAt: trip.closed_at,
      freight,
      expenses,
      earnings,
      expenseItems: expensesByTripId.get(trip.id) ?? [],
      driverHoldsFreight: driverHoldsFreight(trip.client_id),
      freightHeld: freightHeldFromTrip(trip.client_id, freight),
    };
  });

  const totalEarnings = tripRows.reduce((sum, row) => sum + row.earnings, 0);

  const totalTripExpenses = tripExpenseRows.reduce((sum, row) => sum + row.amount, 0);
  const totalVehicleExpenses = vehicleExpenseRows.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const totalExpenses = totalTripExpenses + totalVehicleExpenses;

  const reimbursableExpenses = totalExpenses;
  const ownerAssumedExpenses = totalExpenses;

  const advances: AdvanceRow[] = params.advances.map((advance) => ({
    id: advance.id,
    amount: Number(advance.amount),
    status: advance.status,
    createdAt: advance.created_at,
    tripId: advance.trip_id,
    deliveredByName: advance.delivered_by_name?.trim() || null,
  }));

  const totalAdvances = advances.reduce((sum, row) => sum + row.amount, 0);
  const totalFreightHeld = tripRows.reduce((sum, row) => sum + row.freightHeld, 0);

  // Sueldo + gastos reembolsables − flete en mano (sin cliente) − anticipos
  const netBalance =
    totalEarnings + reimbursableExpenses - totalFreightHeld - totalAdvances;

  const settlements: SettlementHistoryRow[] = (params.settlements ?? []).map(
    (row) => ({
      id: row.id,
      periodLabel: formatSettlementPeriod(row.period_start, row.period_end),
      settledAt: row.settled_at,
      totalEarnings: Number(row.total_earnings),
      totalExpenses: Number(row.total_expenses),
      totalAdvances: Number(row.total_advances),
      netBalance: Number(row.net_balance),
      paymentAmount: Number(row.payment_amount),
      tripCount: row.trip_count ?? 0,
      tripExpenseCount: row.trip_expense_count ?? 0,
      vehicleExpenseCount: row.vehicle_expense_count ?? 0,
    })
  );

  return {
    periodId: params.periodId,
    isCurrentPeriod: params.isCurrentPeriod,
    periodStart: params.periodStart,
    periodEnd: params.periodEnd,
    periodRangeLabel: params.periodRangeLabel,
    periodOptions: params.periodOptions,
    periodLabel: params.periodLabel,
    salaryBasis: params.orgConfig.salary_basis,
    salaryBasisLabel: getSalaryBasisLabel(params.orgConfig.salary_basis),
    driverSalaryLabel: getDriverSalaryLabel(commissionPercent),
    commissionPercent,
    tripRows,
    expenseRows,
    tripExpenseRows,
    vehicleExpenseRows,
    totalEarnings,
    totalExpenses,
    totalTripExpenses,
    totalVehicleExpenses,
    reimbursableExpenses,
    ownerAssumedExpenses,
    advances,
    totalAdvances,
    totalFreightHeld,
    netBalance,
    hasPendingItems:
      params.isCurrentPeriod &&
      (tripRows.length > 0 ||
        expenseRows.length > 0 ||
        advances.length > 0 ||
        totalFreightHeld > 0),
    settlements,
  };
}

export function formatSettlementPeriod(start: string, end: string): string {
  const startDate = new Date(start);
  const endDate = new Date(end);
  const fmt = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  return `${fmt.format(startDate)} – ${fmt.format(endDate)}`;
}

export function getSettlementPaymentLabel(netBalance: number): {
  action: string;
  description: string;
} {
  if (netBalance > 0) {
    return {
      action: "Pago al conductor",
      description: "La empresa paga el saldo pendiente al conductor.",
    };
  }
  if (netBalance < 0) {
    return {
      action: "Entrega al dueño",
      description:
        "El conductor entrega el saldo: flete cobrado en efectivo (viajes sin cliente), anticipos recibidos, menos sueldo y gastos reembolsables.",
    };
  }
  return {
    action: "Cuenta en cero",
    description: "No hay saldo pendiente entre empresa y conductor.",
  };
}
