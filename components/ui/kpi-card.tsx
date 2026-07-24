import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

type Props = {
  label: string;
  value: string;
  icon: LucideIcon;
  trend?: "up" | "down" | "neutral" | "alert";
  className?: string;
};

const TREND_STYLES = {
  up: "text-emerald-600",
  down: "text-red-600",
  neutral: "text-foreground",
  alert: "text-amber-600",
};

const ICON_STYLES = {
  up: "bg-emerald-50 text-emerald-600",
  down: "bg-red-50 text-red-600",
  neutral: "bg-slate-100 text-slate-600",
  alert: "bg-amber-50 text-amber-600",
};

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend = "neutral",
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
          <p className="text-sm font-medium text-muted-foreground">{label}</p>
          <p className={cn("mt-2 text-2xl font-bold tracking-tight", TREND_STYLES[trend])}>
            {value}
          </p>
        </div>
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl",
            ICON_STYLES[trend]
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}
