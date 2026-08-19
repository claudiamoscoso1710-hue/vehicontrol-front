export type SettlementSpreadsheetExpenseItem = {
  id: string;
  categoryName: string;
  notes: string | null;
  amount: number;
  createdAt: string;
  additionalTripExpense?: boolean;
  ownerPrepaid?: boolean;
};

export type SettlementSpreadsheetTripRow = {
  id: string;
  label: string;
  sublabel?: string | null;
  freight: number;
  /** Suma visible de gastos del viaje (incluye anticipados). */
  tripExpenses: number;
  /** Gastos que restan utilidad (excluye anticipados). */
  tripExpensesForProfit: number;
  driverSalary: number;
  expenseItems: SettlementSpreadsheetExpenseItem[];
  /** Viaje en curso: no suma al total confirmado ni a la utilidad. */
  isPending?: boolean;
};

export type SettlementSpreadsheetVehicleExpenseRow = {
  id: string;
  categoryName: string;
  notes: string | null;
  amount: number;
  vehicleLabel?: string | null;
  createdAt: string;
};

export type SettlementSpreadsheetAdvanceRow = {
  id: string;
  amount: number;
  createdAt: string;
  status: string;
  deliveredByName?: string | null;
};

export type SettlementSpreadsheetData = {
  trips: SettlementSpreadsheetTripRow[];
  vehicleExpenses: SettlementSpreadsheetVehicleExpenseRow[];
  advances: SettlementSpreadsheetAdvanceRow[];
  totals: {
    /** Fletes de viajes cerrados. */
    freight: number;
    /** Gastos de viaje cerrados (sin anticipados). */
    tripExpenses: number;
    /** Sueldo de viajes cerrados. */
    driverSalary: number;
    vehicleExpenses: number;
    advances: number;
    /** Fletes − gastos viaje − sueldo − gastos carro (solo confirmado). */
    netMargin: number;
    /** Viajes en curso — informativo, no entra a utilidad. */
    pendingFreight: number;
    pendingTripExpenses: number;
    pendingDriverSalary: number;
  };
  footerNote?: string;
  emptyMessage?: string;
};
