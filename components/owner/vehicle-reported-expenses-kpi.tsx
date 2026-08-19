"use client";

import { Receipt } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  total: number;
  tripCount: number;
  tripTotal: number;
  vehicleTotal: number;
  className?: string;
};

export function VehicleReportedExpensesKpi({
  total,
  tripCount,
  tripTotal,
  vehicleTotal,
  className,
}: Props) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border/80 bg-card p-5 shadow-sm",
        className
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
            {tripCount} viaje{tripCount === 1 ? "" : "s"} · {formatCurrency(tripTotal)}{" "}
            en viajes · {formatCurrency(vehicleTotal)} del vehículo
          </p>
        </div>
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
          <Receipt className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
