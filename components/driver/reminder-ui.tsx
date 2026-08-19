"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, CalendarDays, X } from "lucide-react";
import {
  dismissReminderBanner,
  snoozeVehicleExpenseReminder,
} from "@/lib/actions/vehicle-expense-reminders";
import {
  getRecurrenceLabel,
  isReminderBannerActive,
  isReminderPending,
  type VehicleExpenseReminder,
} from "@/lib/reminders/vehicle-expense-reminders";
import { cn } from "@/lib/utils";

type Props = {
  reminders: VehicleExpenseReminder[];
};

export function ReminderBannerStack({ reminders }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [hiddenIds, setHiddenIds] = useState<Set<string>>(new Set());

  const active = useMemo(
    () =>
      reminders.filter(
        (reminder) => isReminderBannerActive(reminder) && !hiddenIds.has(reminder.id)
      ),
    [reminders, hiddenIds]
  );

  const current = active[0];

  if (!current) return null;

  function runAction(action: () => Promise<{ success: boolean; error?: string }>) {
    startTransition(async () => {
      const result = await action();
      if (result.success) {
        router.refresh();
      } else {
        setHiddenIds((prev) => {
          const next = new Set(prev);
          next.delete(current!.id);
          return next;
        });
      }
    });
  }

  const dueLabel = new Date(current.dueDate + "T12:00:00").toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="border-b border-amber-200/80 bg-amber-50 px-4 py-3">
      <div className="mx-auto max-w-md">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500 text-white shadow-sm">
            <BellRing className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-amber-950">{current.label}</p>
            <p className="mt-0.5 text-xs text-amber-900/90">
              Vence el <span className="font-semibold">{dueLabel}</span>
              {current.vehiclePlate ? ` · ${current.vehiclePlate}` : null}
            </p>
            <p className="mt-1 text-[11px] text-amber-800/80">
              {getRecurrenceLabel(current.recurrenceInterval, current.recurrenceUnit)}
            </p>
            {active.length > 1 ? (
              <p className="mt-1 text-[11px] font-medium text-amber-800">
                +{active.length - 1} recordatorio{active.length - 1 === 1 ? "" : "s"} más
              </p>
            ) : null}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runAction(() =>
                    snoozeVehicleExpenseReminder(current.id, current.organizationId)
                  )
                }
                className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 shadow-sm ring-1 ring-amber-200 transition hover:bg-amber-100 disabled:opacity-50"
              >
                Recordarme mañana
              </button>
              <button
                type="button"
                disabled={pending}
                onClick={() =>
                  runAction(() =>
                    dismissReminderBanner(
                      current.id,
                      current.organizationId,
                      current.dueDate
                    )
                  )
                }
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-amber-900/80 transition hover:bg-amber-100/80 disabled:opacity-50"
              >
                No mostrar más
              </button>
            </div>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() => {
              setHiddenIds((prev) => new Set(prev).add(current.id));
              router.refresh();
            }}
            className="rounded-lg p-1 text-amber-800/70 hover:bg-amber-100"
            aria-label="Cerrar banner"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export function ReminderBellButton({
  reminders,
  className,
}: {
  reminders: VehicleExpenseReminder[];
  className?: string;
}) {
  const bannerCount = reminders.filter((r) => isReminderBannerActive(r)).length;
  const pendingCount = reminders.filter((r) => isReminderPending(r)).length;

  return (
    <a
      href="/driver/reminders"
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl text-muted-foreground transition-all hover:bg-muted hover:text-foreground active:scale-95",
        className
      )}
      aria-label="Recordatorios del vehículo"
    >
      <CalendarDays className="h-4 w-4" />
      {pendingCount > 0 ? (
        <span
          className={cn(
            "absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full px-1 text-[10px] font-bold text-white",
            bannerCount > 0 ? "bg-amber-500" : "bg-violet-600"
          )}
        >
          {pendingCount > 9 ? "9+" : pendingCount}
        </span>
      ) : null}
    </a>
  );
}
