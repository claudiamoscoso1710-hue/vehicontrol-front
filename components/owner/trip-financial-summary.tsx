import Link from "next/link";
import {
  ArrowDownRight,
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Truck,
} from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { FinancialBreakdownBar } from "@/components/owner/financial-breakdown-bar";
import { Card, CardBody } from "@/components/ui/card";

type Props = {
  freightValue: number;
  reportedExpenseTotal: number;
  driverSalary?: number;
  commissionPercent?: number;
  vehiclePlate?: string;
  vehicleId?: string;
  incomeRegistered: boolean;
};

export function TripFinancialSummary({
  freightValue,
  reportedExpenseTotal,
  driverSalary = 0,
  commissionPercent = 0,
  vehiclePlate,
  vehicleId,
  incomeRegistered,
}: Props) {
  const expenseTotal = reportedExpenseTotal + driverSalary;
  const margin = freightValue - expenseTotal;
  const marginPct =
    freightValue > 0 ? Math.round((margin / freightValue) * 100) : 0;

  return (
    <Card className="overflow-hidden border-brand/20">
      <CardBody className="space-y-5 p-0">
        <div className="border-b border-brand/10 bg-gradient-to-r from-brand/10 to-transparent px-5 py-4">
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-brand" />
            <h2 className="font-semibold">Resumen financiero del viaje</h2>
          </div>
          {incomeRegistered && (
            <p className="mt-1 text-xs text-emerald-700">
              Flete registrado automáticamente al cerrar el viaje
            </p>
          )}
        </div>

        <div className="grid gap-3 px-5 sm:grid-cols-3">
          <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50/80 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-700">
              <CircleDollarSign className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-emerald-800">Flete</p>
              <p className="font-bold text-emerald-900">
                {formatCurrency(freightValue)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50/80 p-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
              <Receipt className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs text-amber-800">Gastos del viaje</p>
              <p className="font-bold text-amber-900">
                {formatCurrency(expenseTotal)}
              </p>
              {driverSalary > 0 ? (
                <p className="text-[11px] text-amber-800/80">
                  Reportados {formatCurrency(reportedExpenseTotal)} · Sueldo{" "}
                  {commissionPercent}% {formatCurrency(driverSalary)}
                </p>
              ) : null}
            </div>
          </div>
          <div
            className={`flex items-center gap-3 rounded-xl border p-3 ${
              margin >= 0
                ? "border-sky-200 bg-sky-50/80"
                : "border-red-200 bg-red-50/80"
            }`}
          >
            <div
              className={`flex h-10 w-10 items-center justify-center rounded-lg ${
                margin >= 0
                  ? "bg-sky-100 text-sky-700"
                  : "bg-red-100 text-red-700"
              }`}
            >
              <ArrowDownRight className="h-5 w-5" />
            </div>
            <div>
              <p
                className={`text-xs ${
                  margin >= 0 ? "text-sky-800" : "text-red-800"
                }`}
              >
                Utilidad {marginPct !== 0 && `(${marginPct}%)`}
              </p>
              <p
                className={`font-bold ${
                  margin >= 0 ? "text-sky-900" : "text-red-900"
                }`}
              >
                {formatCurrency(margin)}
              </p>
            </div>
          </div>
        </div>

        <div className="px-5 pb-5">
          <FinancialBreakdownBar
            income={freightValue}
            expenses={expenseTotal}
            showLabels={false}
          />
          {vehiclePlate && vehicleId && (
            <Link
              href={`/app/vehicles/${vehicleId}`}
              className="mt-4 flex items-center gap-2 text-sm font-medium text-brand hover:underline"
            >
              <Truck className="h-4 w-4" />
              Ver rentabilidad de {vehiclePlate}
            </Link>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
