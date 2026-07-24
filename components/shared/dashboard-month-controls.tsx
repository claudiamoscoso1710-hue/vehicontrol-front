"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarDays } from "lucide-react";
import type { DashboardMonthOption } from "@/lib/reports/dashboard-month";

type Props = {
  options: DashboardMonthOption[];
  selectedMonthId: string;
  rangeLabel: string;
  isCurrentMonth: boolean;
};

export function DashboardMonthControls({
  options,
  selectedMonthId,
  rangeLabel,
  isCurrentMonth,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextMonthId: string) {
    const params = new URLSearchParams(searchParams.toString());
    const isCurrent = options[0]?.id === nextMonthId;

    if (isCurrent) {
      params.delete("month");
    } else {
      params.set("month", nextMonthId);
    }

    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <CalendarDays className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isCurrentMonth ? "Mes actual" : "Mes seleccionado"}
          </p>
          <p className="text-sm capitalize text-muted-foreground">{rangeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Vista consolidada por mes calendario. Cada vehículo y conductor
            liquida en su propio período; aquí se suman las cifras del mes.
          </p>
        </div>
      </div>

      {options.length > 1 ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Ver otro mes
          </span>
          <select
            value={selectedMonthId}
            onChange={(event) => handleChange(event.target.value)}
            className="w-full rounded-lg border bg-background px-3 py-2 text-sm"
          >
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      ) : null}
    </section>
  );
}
