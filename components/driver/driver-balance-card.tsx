import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getSettlementPaymentLabel } from "@/lib/reports/driver-account-statement";
import { cn } from "@/lib/utils";

type Props = {
  netBalance: number;
  hasPendingItems: boolean;
};

export function DriverBalanceCard({
  netBalance,
  hasPendingItems,
}: Props) {
  const isPositive = netBalance > 0;
  const isNegative = netBalance < 0;
  const payment = getSettlementPaymentLabel(netBalance);

  const balanceLabel = !hasPendingItems
    ? "Cuenta al día"
    : isPositive
      ? "Saldo a tu favor"
      : isNegative
        ? "Saldo pendiente"
        : "Sin saldo";

  return (
    <Link
      href="/driver/account"
      className={cn(
        "group block overflow-hidden rounded-2xl border shadow-sm transition-all hover:shadow-md active:scale-[0.99]",
        !hasPendingItems &&
          "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-card to-card",
        hasPendingItems &&
          isPositive &&
          "border-emerald-200/80 bg-gradient-to-br from-emerald-50/90 via-card to-card",
        hasPendingItems &&
          isNegative &&
          "border-amber-200/80 bg-gradient-to-br from-amber-50/90 via-card to-card",
        hasPendingItems &&
          !isPositive &&
          !isNegative &&
          "border-border/80 bg-gradient-to-br from-muted/40 via-card to-card"
      )}
    >
      <div className="flex items-center gap-3 p-4">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-sm",
            !hasPendingItems && "bg-emerald-100 text-emerald-700",
            hasPendingItems && isPositive && "bg-emerald-100 text-emerald-700",
            hasPendingItems && isNegative && "bg-amber-100 text-amber-800",
            hasPendingItems && !isPositive && !isNegative && "bg-muted text-muted-foreground"
          )}
        >
          <Wallet className="h-5 w-5" />
        </div>

        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
            Mi saldo · período actual
          </p>
          <p className="mt-0.5 font-display text-2xl font-bold leading-none tracking-tight">
            {hasPendingItems
              ? formatCurrency(Math.abs(netBalance))
              : formatCurrency(0)}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {hasPendingItems ? payment.action : balanceLabel}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground/80">
            Toca para ver el detalle de tu cuenta
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-1 text-brand">
          <span className="text-xs font-semibold opacity-0 transition-opacity group-hover:opacity-100 sm:opacity-100">
            Ver cuenta
          </span>
          <ChevronRight className="h-5 w-5 transition-transform group-hover:translate-x-0.5" />
        </div>
      </div>
    </Link>
  );
}
