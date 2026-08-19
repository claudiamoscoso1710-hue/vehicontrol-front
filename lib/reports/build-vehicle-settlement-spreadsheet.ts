import type { VehicleExpenseItem } from "@/components/owner/vehicle-reported-expenses";
import {
  isConfirmedTrip,
  sumTripExpensesForVehicleProfit,
} from "@/lib/expenses/vehicle-profitability";
import type { SettlementSpreadsheetData } from "@/lib/reports/settlement-spreadsheet-types";
import { getSalaryBasisLabel } from "@/lib/settings/driver-compensation";
import type { SalaryBasis } from "@/lib/settings/driver-compensation";

type TripInput = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freightValue: number;
  createdAt: string;
  driverName: string | null;
  driverSalary: number;
  expenses: VehicleExpenseItem[];
};

type AdvanceInput = {
  id: string;
  amount: number;
  status: string;
  created_at: string;
  delivered_by_name?: string | null;
};

function getCategoryName(
  categories: VehicleExpenseItem["expense_categories"]
): string {
  const category = Array.isArray(categories) ? categories[0] : categories;
  return category?.name ?? "Gasto";
}

export function buildVehicleSettlementSpreadsheet(params: {
  trips: TripInput[];
  vehicleExpenses: VehicleExpenseItem[];
  advances: AdvanceInput[];
  vehiclePlate: string;
  commissionPercent: number;
  salaryBasis: SalaryBasis;
}): SettlementSpreadsheetData {
  const trips = params.trips.map((trip) => {
    const tripExpenses = trip.expenses.reduce(
      (sum, expense) => sum + expense.amount,
      0
    );
    const tripExpensesForProfit = sumTripExpensesForVehicleProfit(trip.expenses);
    const isPending = !isConfirmedTrip(trip.status);

    return {
      id: trip.id,
      label: `${trip.origin} → ${trip.destination}`,
      sublabel: [
        new Date(trip.createdAt).toLocaleDateString("es-CO"),
        trip.driverName,
        isPending ? "En curso · pendiente" : null,
      ]
        .filter(Boolean)
        .join(" · "),
      freight: trip.freightValue,
      tripExpenses,
      tripExpensesForProfit,
      driverSalary: trip.driverSalary,
      isPending,
      expenseItems: trip.expenses.map((expense) => ({
        id: expense.id,
        categoryName: getCategoryName(expense.expense_categories),
        notes: expense.notes,
        amount: expense.amount,
        createdAt: expense.created_at,
        additionalTripExpense: Boolean(expense.additional_trip_expense),
        ownerPrepaid: Boolean(expense.owner_prepaid),
      })),
    };
  });

  const vehicleExpenses = params.vehicleExpenses.map((expense) => ({
    id: expense.id,
    categoryName: getCategoryName(expense.expense_categories),
    notes: expense.notes,
    amount: expense.amount,
    vehicleLabel: expense.vehiclePlate ?? params.vehiclePlate,
    createdAt: expense.created_at,
  }));

  const advances = params.advances.map((advance) => ({
    id: advance.id,
    amount: Number(advance.amount),
    createdAt: advance.created_at,
    status: advance.status,
    deliveredByName: advance.delivered_by_name?.trim() || null,
  }));

  const confirmedTrips = trips.filter((row) => !row.isPending);
  const pendingTrips = trips.filter((row) => row.isPending);

  const totalTripExpenses = confirmedTrips.reduce(
    (sum, row) => sum + row.tripExpensesForProfit,
    0
  );
  const totalDriverSalary = confirmedTrips.reduce(
    (sum, row) => sum + row.driverSalary,
    0
  );
  const totalVehicleExpenses = vehicleExpenses.reduce(
    (sum, row) => sum + row.amount,
    0
  );
  const totalAdvances = advances.reduce((sum, row) => sum + row.amount, 0);

  const freight = confirmedTrips.reduce((sum, row) => sum + row.freight, 0);
  const pendingFreight = pendingTrips.reduce((sum, row) => sum + row.freight, 0);
  const pendingTripExpenses = pendingTrips.reduce(
    (sum, row) => sum + row.tripExpensesForProfit,
    0
  );
  const pendingDriverSalary = pendingTrips.reduce(
    (sum, row) => sum + row.driverSalary,
    0
  );

  const netMargin =
    freight - totalTripExpenses - totalDriverSalary - totalVehicleExpenses;

  return {
    trips,
    vehicleExpenses,
    advances,
    totals: {
      freight,
      tripExpenses: totalTripExpenses,
      driverSalary: totalDriverSalary,
      vehicleExpenses: totalVehicleExpenses,
      advances: totalAdvances,
      netMargin,
      pendingFreight,
      pendingTripExpenses,
      pendingDriverSalary,
    },
    footerNote: `Toca la suma de gastos de un viaje para ver el detalle. Utilidad solo con viajes cerrados; gastos anticipados y anticipos al conductor son informativos. Base sueldo: ${getSalaryBasisLabel(params.salaryBasis).toLowerCase()} (${params.commissionPercent}%).`,
    emptyMessage: "Sin movimientos en este período para este vehículo.",
  };
}
