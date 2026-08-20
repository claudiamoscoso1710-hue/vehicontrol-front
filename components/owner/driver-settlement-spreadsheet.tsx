"use client";

import type { DriverAccountStatement } from "@/lib/reports/driver-account-statement";
import type { SettlementSpreadsheetData } from "@/lib/reports/settlement-spreadsheet-types";
import { SettlementSpreadsheetTable } from "@/components/owner/settlement-spreadsheet-table";

type Props = {
  statement: DriverAccountStatement;
};

function fromDriverStatement(
  statement: DriverAccountStatement
): SettlementSpreadsheetData {
  return {
    trips: statement.tripRows.map((trip) => ({
      id: trip.tripId,
      label: `${trip.origin} → ${trip.destination}`,
      sublabel: trip.closedAt
        ? new Date(trip.closedAt).toLocaleDateString("es-CO")
        : null,
      freight: trip.freight,
      tripExpenses: trip.expenses,
      tripExpensesForProfit: trip.expenses,
      driverSalary: trip.earnings,
      freightHeld: trip.freightHeld,
      isPending: false,
      expenseItems: trip.expenseItems.map((expense) => ({
        id: expense.id,
        categoryName: expense.categoryName,
        notes: expense.notes,
        amount: expense.amount,
        createdAt: expense.createdAt,
        additionalTripExpense: expense.additionalTripExpense,
        ownerPrepaid: false,
      })),
    })),
    vehicleExpenses: statement.vehicleExpenseRows.map((expense) => ({
      id: expense.id,
      categoryName: expense.categoryName,
      notes: expense.notes,
      amount: expense.amount,
      vehicleLabel: expense.vehicleLabel,
      createdAt: expense.createdAt,
    })),
    advances: statement.advances.map((advance) => ({
      id: advance.id,
      amount: advance.amount,
      createdAt: advance.createdAt,
      status: advance.status,
      deliveredByName: advance.deliveredByName,
    })),
    totals: {
      freight: statement.tripRows.reduce((sum, row) => sum + row.freight, 0),
      tripExpenses: statement.totalTripExpenses,
      driverSalary: statement.totalEarnings,
      vehicleExpenses: statement.totalVehicleExpenses,
      advances: statement.totalAdvances,
      freightHeld: statement.totalFreightHeld,
      netMargin:
        statement.tripRows.reduce((sum, row) => sum + row.freight, 0) -
        statement.totalTripExpenses -
        statement.totalEarnings -
        statement.totalVehicleExpenses,
      pendingFreight: 0,
      pendingTripExpenses: 0,
      pendingDriverSalary: 0,
    },
    footerNote: `Toca la suma de gastos de un viaje para ver el detalle. Base sueldo: ${statement.salaryBasisLabel.toLowerCase()} (${statement.commissionPercent}%). El flete en mano aplica a viajes sin cliente (cobrado por el conductor).`,
    emptyMessage: "Sin movimientos pendientes en este período.",
  };
}

export function DriverSettlementSpreadsheet({ statement }: Props) {
  return <SettlementSpreadsheetTable data={fromDriverStatement(statement)} />;
}
