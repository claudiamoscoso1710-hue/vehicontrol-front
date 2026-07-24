"use client";

import { useState } from "react";
import { Car, ChevronDown, Receipt, Route } from "lucide-react";
import { TripCostList, tripCostTotal } from "@/components/owner/trip-cost-list";
import { ExpenseReviewList } from "@/components/owner/expense-review-list";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/status-badge";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

export type VehicleExpenseItem = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  created_at: string;
  trip_id: string | null;
  settlement_id: string | null;
  tripLabel: string | null;
  vehiclePlate: string | null;
  expense_categories: { name: string } | { name: string }[] | null;
  drivers: { full_name: string } | { full_name: string }[] | null;
  hasEvidence: boolean;
};

export type VehicleTripWithExpenses = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freightValue: number;
  createdAt: string;
  driverName: string | null;
  commissionPercent: number;
  driverSalary: number;
  expenses: VehicleExpenseItem[];
};

type Props = {
  total: number;
  vehicleExpenses: VehicleExpenseItem[];
  tripsWithExpenses: VehicleTripWithExpenses[];
};

function TripExpenseGroup({ trip }: { trip: VehicleTripWithExpenses }) {
  const [open, setOpen] = useState(false);
  const tripExpenseTotal = tripCostTotal(trip.expenses, trip.driverSalary);
  const itemCount =
    trip.expenses.length + (trip.driverSalary > 0 ? 1 : 0);

  return (
    <div className="overflow-hidden rounded-xl border border-border/60">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-muted/30"
      >
        <Route className="h-4 w-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0 flex-1">
          <p className="font-medium">
            {trip.origin} → {trip.destination}
          </p>
          <p className="text-xs text-muted-foreground">
            Flete {formatCurrency(trip.freightValue)} · {itemCount} concepto
            {itemCount === 1 ? "" : "s"} ·{" "}
            {new Date(trip.createdAt).toLocaleDateString("es-CO")}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className="text-sm font-semibold text-blue-700">
            {formatCurrency(tripExpenseTotal)}
          </span>
          <StatusBadge status={trip.status} />
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground transition-transform",
              open && "rotate-180"
            )}
          />
        </div>
      </button>

      {open ? (
        <div className="border-t border-border/60 bg-muted/10 px-3 py-3">
          <TripCostList
            expenses={trip.expenses}
            driverName={trip.driverName}
            commissionPercent={trip.commissionPercent}
            driverSalary={trip.driverSalary}
            salaryEstimated={trip.status !== "closed"}
            emptyMessage="Sin otros gastos reportados en este viaje."
          />
        </div>
      ) : null}
    </div>
  );
}

export function VehicleReportedExpenses({
  total,
  vehicleExpenses,
  tripsWithExpenses,
}: Props) {
  const [open, setOpen] = useState(false);

  const vehicleTotal = vehicleExpenses.reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const tripTotal = tripsWithExpenses.reduce(
    (sum, trip) => sum + tripCostTotal(trip.expenses, trip.driverSalary),
    0
  );
  const tripCount = tripsWithExpenses.length;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className={cn(
          "rounded-xl border border-border/80 bg-card p-5 text-left shadow-sm transition-colors",
          "hover:border-brand/30 hover:bg-brand/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
          open && "border-brand/30 ring-1 ring-brand/20"
        )}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">
              Gastos reportados
            </p>
            <p className="mt-2 text-2xl font-bold tracking-tight text-foreground">
              {formatCurrency(total)}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              {tripCount} viaje{tripCount === 1 ? "" : "s"} ·{" "}
              {formatCurrency(tripTotal)} en viajes ·{" "}
              {formatCurrency(vehicleTotal)} del vehículo · clic para{" "}
              {open ? "ocultar" : "ver"}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <Receipt className="h-5 w-5" />
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 text-muted-foreground transition-transform",
                open && "rotate-180"
              )}
            />
          </div>
        </div>
      </button>

      {open ? (
        <div className="col-span-full space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <Route className="h-5 w-5 text-brand" />
                  <div>
                    <h2 className="font-semibold">Gastos en viajes</h2>
                    <p className="text-sm text-muted-foreground">
                      Sumatoria del período · {formatCurrency(tripTotal)}
                    </p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  {tripCount} viaje{tripCount === 1 ? "" : "s"} con costos
                </p>
              </div>
            </CardHeader>
            <CardBody className="space-y-2">
              {tripsWithExpenses.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  Sin gastos reportados en viajes para este vehículo.
                </p>
              ) : (
                tripsWithExpenses.map((trip) => (
                  <TripExpenseGroup key={trip.id} trip={trip} />
                ))
              )}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Car className="h-5 w-5 text-brand" />
                <div>
                  <h2 className="font-semibold">Gastos del vehículo</h2>
                  <p className="text-sm text-muted-foreground">
                    SOAT, rodamiento, mantenimiento, etc. ·{" "}
                    {formatCurrency(vehicleTotal)}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardBody>
              <ExpenseReviewList
                expenses={vehicleExpenses}
                emptyMessage="Sin gastos del camión registrados para este vehículo."
              />
            </CardBody>
          </Card>
        </div>
      ) : null}
    </>
  );
}
