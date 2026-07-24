"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { CalendarRange } from "lucide-react";
import type { SettlementPeriodOption } from "@/lib/reports/settlement-period";

type Props = {
  options: SettlementPeriodOption[];
  selectedPeriodId: string;
  periodRangeLabel: string;
  isCurrentPeriod: boolean;
  paramName?: string;
};

export function SettlementPeriodControls({
  options,
  selectedPeriodId,
  periodRangeLabel,
  isCurrentPeriod,
  paramName = "period",
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function handleChange(nextPeriodId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (nextPeriodId === "current") {
      params.delete(paramName);
    } else {
      params.set(paramName, nextPeriodId);
    }
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
          <CalendarRange className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">
            {isCurrentPeriod ? "Período actual" : "Período histórico"}
          </p>
          <p className="text-sm text-muted-foreground">{periodRangeLabel}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Desde el primer viaje, gasto o anticipo pendiente hasta que se liquida
            la cuenta. No sigue el calendario mensual: cierra cuando el dueño
            liquida.
          </p>
        </div>
      </div>

      {options.length > 1 ? (
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Ver otro período
          </span>
          <select
            value={selectedPeriodId}
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
