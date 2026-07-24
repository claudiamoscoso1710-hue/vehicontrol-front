import { cn } from "@/lib/utils";
import { formatCurrency } from "@/lib/format";

type Props = {
  income: number;
  expenses: number;
  className?: string;
  showLabels?: boolean;
};

export function FinancialBreakdownBar({
  income,
  expenses,
  className,
  showLabels = true,
}: Props) {
  const max = Math.max(income, expenses, 1);
  const incomeWidth = Math.round((income / max) * 100);
  const expenseWidth = Math.round((expenses / max) * 100);
  const margin = income - expenses;

  return (
    <div className={cn("space-y-3", className)}>
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-emerald-700">Ingresos (fletes)</span>
          <span className="font-semibold text-emerald-700">
            {formatCurrency(income)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-emerald-100">
          <div
            className="h-full rounded-full bg-emerald-500 transition-all"
            style={{ width: `${incomeWidth}%` }}
          />
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-amber-700">Gastos reportados</span>
          <span className="font-semibold text-amber-700">
            {formatCurrency(expenses)}
          </span>
        </div>
        <div className="h-2.5 overflow-hidden rounded-full bg-amber-100">
          <div
            className="h-full rounded-full bg-amber-500 transition-all"
            style={{ width: `${expenseWidth}%` }}
          />
        </div>
      </div>

      {showLabels && (
        <div
          className={cn(
            "flex items-center justify-between rounded-lg px-3 py-2 text-sm font-semibold",
            margin >= 0
              ? "bg-emerald-50 text-emerald-800"
              : "bg-red-50 text-red-800"
          )}
        >
          <span>Utilidad</span>
          <span>{formatCurrency(margin)}</span>
        </div>
      )}
    </div>
  );
}
