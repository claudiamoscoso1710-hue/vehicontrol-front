import Link from "next/link";
import { CalendarRange, Route, Truck, User } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FinancialBreakdownBar } from "@/components/owner/financial-breakdown-bar";
import { StatusBadge } from "@/components/ui/status-badge";
import type { VehicleProfitability } from "@/lib/reports/vehicle-profitability";

type VehicleCardData = VehicleProfitability & {
  assignedDriverName?: string | null;
  periodRangeLabel?: string | null;
  hasAssignedDriver?: boolean;
  hasPendingPeriod?: boolean;
};

type Props = {
  vehicle: VehicleCardData;
  rank?: number;
};

export function VehicleProfitCard({ vehicle, rank }: Props) {
  const showPeriodInfo = Boolean(vehicle.periodRangeLabel);
  const hasAssignedDriver = vehicle.hasAssignedDriver ?? false;
  const marginPct =
    vehicle.totalIncome > 0
      ? Math.round((vehicle.margin / vehicle.totalIncome) * 100)
      : 0;

  return (
    <Link
      href={`/app/vehicles/${vehicle.vehicleId}`}
      className="group block rounded-xl border border-border/80 bg-card p-4 shadow-sm transition-all hover:border-brand/40 hover:shadow-md"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-brand/10 text-brand group-hover:bg-brand group-hover:text-brand-foreground">
            <Truck className="h-6 w-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              {rank !== undefined && (
                <span className="text-xs font-bold text-muted-foreground">
                  #{rank}
                </span>
              )}
              <span className="text-lg font-bold tracking-wide">
                {vehicle.plate}
              </span>
            </div>
            <p className="text-sm text-muted-foreground">
              {vehicle.brand ?? "Vehículo"} · {vehicle.tripCount} viaje
              {vehicle.tripCount === 1 ? "" : "s"}
              {showPeriodInfo ? " en el período" : ""}
            </p>
            {hasAssignedDriver && vehicle.assignedDriverName ? (
              <p className="mt-1 inline-flex items-center gap-1 text-xs text-muted-foreground">
                <User className="h-3 w-3" />
                {vehicle.assignedDriverName}
              </p>
            ) : null}
          </div>
        </div>
        <div className="text-right">
          <p
            className={`text-lg font-bold ${
              vehicle.margin >= 0 ? "text-emerald-600" : "text-red-600"
            }`}
          >
            {formatCurrency(vehicle.margin)}
          </p>
          {vehicle.totalIncome > 0 && (
            <p className="text-xs text-muted-foreground">{marginPct}% utilidad</p>
          )}
        </div>
      </div>

      <div className="mt-4">
        <FinancialBreakdownBar
          income={vehicle.totalIncome}
          expenses={vehicle.totalExpenses}
          showLabels={false}
        />
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Route className="h-3.5 w-3.5" />
          {vehicle.tripCount} viaje{vehicle.tripCount === 1 ? "" : "s"}
        </div>
        <StatusBadge status={vehicle.operationalStatus} />
      </div>

      {showPeriodInfo ? (
        <div className="mt-3 rounded-lg border bg-muted/30 px-3 py-2">
          <div className="flex items-start gap-2 text-xs">
            <CalendarRange className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand" />
            <div className="min-w-0">
              <p className="font-medium text-foreground">Período actual</p>
              <p className="text-muted-foreground">{vehicle.periodRangeLabel}</p>
              {vehicle.hasPendingPeriod === false ? (
                <p className="mt-1 text-muted-foreground">
                  Sin movimientos pendientes de liquidar.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : vehicle.hasAssignedDriver === false ? (
        <div className="mt-3 rounded-lg border border-dashed px-3 py-2 text-xs text-muted-foreground">
          Asigna un conductor para iniciar el período de liquidación del vehículo.
        </div>
      ) : null}
    </Link>
  );
}
