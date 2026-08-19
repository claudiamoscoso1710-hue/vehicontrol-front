"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { BellRing, ChevronLeft, ChevronRight } from "lucide-react";
import {
  dismissVehicleExpenseReminder,
  snoozeVehicleExpenseReminder,
} from "@/lib/actions/vehicle-expense-reminders";
import {
  getRecurrenceLabel,
  isReminderBannerActive,
  isReminderPending,
  type VehicleExpenseReminder,
} from "@/lib/reminders/vehicle-expense-reminders";
import { cn } from "@/lib/utils";

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function monthKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth()}`;
}

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

type Props = {
  reminders: VehicleExpenseReminder[];
};

export function ReminderCalendarClient({ reminders }: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [cursor, setCursor] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const pendingReminders = useMemo(
    () => reminders.filter((r) => isReminderPending(r)).sort((a, b) => a.dueDate.localeCompare(b.dueDate)),
    [reminders]
  );

  const dueDates = useMemo(() => {
    const map = new Map<string, VehicleExpenseReminder[]>();
    for (const reminder of pendingReminders) {
      const current = map.get(reminder.dueDate) ?? [];
      current.push(reminder);
      map.set(reminder.dueDate, current);
    }
    return map;
  }, [pendingReminders]);

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = new Date(year, month, 1).getDay();
  const totalDays = daysInMonth(year, month);
  const monthLabel = cursor.toLocaleDateString("es-CO", { month: "long", year: "numeric" });

  const cells: Array<{ day: number | null; dateKey?: string }> = [];
  for (let i = 0; i < firstWeekday; i += 1) cells.push({ day: null });
  for (let day = 1; day <= totalDays; day += 1) {
    const dateKey = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    cells.push({ day, dateKey });
  }

  function shiftMonth(delta: number) {
    setCursor(new Date(year, month + delta, 1));
  }

  function handleSnooze(reminder: VehicleExpenseReminder) {
    startTransition(async () => {
      await snoozeVehicleExpenseReminder(reminder.id, reminder.organizationId);
      router.refresh();
    });
  }

  function handleDismiss(reminder: VehicleExpenseReminder) {
    startTransition(async () => {
      await dismissVehicleExpenseReminder(reminder.id, reminder.organizationId);
      router.refresh();
    });
  }

  return (
    <div className="space-y-4">
      <section className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Mes anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <p className="text-sm font-semibold capitalize">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            className="rounded-lg p-2 hover:bg-muted"
            aria-label="Mes siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 px-3 pb-3 pt-2 text-center text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
          {["Do", "Lu", "Ma", "Mi", "Ju", "Vi", "Sa"].map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 px-3 pb-4">
          {cells.map((cell, index) => {
            if (!cell.day || !cell.dateKey) {
              return <div key={`empty-${index}`} className="aspect-square" />;
            }

            const items = dueDates.get(cell.dateKey) ?? [];
            const today = new Date();
            const isToday =
              today.getFullYear() === year &&
              today.getMonth() === month &&
              today.getDate() === cell.day;

            return (
              <div
                key={cell.dateKey}
                className={cn(
                  "flex aspect-square flex-col items-center justify-center rounded-xl text-xs",
                  items.length > 0 ? "bg-violet-100 font-semibold text-violet-900" : "text-muted-foreground",
                  isToday && "ring-2 ring-brand/40"
                )}
              >
                <span>{cell.day}</span>
                {items.length > 0 ? (
                  <span className="mt-0.5 h-1.5 w-1.5 rounded-full bg-violet-600" />
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      <section className="space-y-2">
        <h2 className="px-1 text-sm font-semibold">Próximos pendientes</h2>
        {pendingReminders.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border/70 bg-muted/20 px-4 py-8 text-center text-sm text-muted-foreground">
            No tienes recordatorios activos. Configúralos al reportar un gasto del vehículo.
          </div>
        ) : (
          <ul className="space-y-2">
            {pendingReminders.map((reminder) => {
              const due = parseDateOnly(reminder.dueDate);
              const active = isReminderBannerActive(reminder);
              return (
                <li
                  key={reminder.id}
                  className={cn(
                    "rounded-2xl border px-4 py-3",
                    active
                      ? "border-amber-200 bg-amber-50"
                      : "border-border/60 bg-card"
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={cn(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
                        active ? "bg-amber-500 text-white" : "bg-violet-100 text-violet-700"
                      )}
                    >
                      <BellRing className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold">{reminder.label}</p>
                      <p className="text-xs text-muted-foreground">
                        Vence{" "}
                        {due.toLocaleDateString("es-CO", {
                          weekday: "short",
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                        {reminder.vehiclePlate ? ` · ${reminder.vehiclePlate}` : null}
                      </p>
                      <p className="mt-0.5 text-[11px] text-muted-foreground">
                        {getRecurrenceLabel(reminder.recurrenceInterval, reminder.recurrenceUnit)}
                      </p>
                      <div className="mt-2 flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleSnooze(reminder)}
                          className="rounded-lg bg-muted px-2.5 py-1 text-[11px] font-semibold"
                        >
                          Recordarme mañana
                        </button>
                        <button
                          type="button"
                          disabled={pending}
                          onClick={() => handleDismiss(reminder)}
                          className="rounded-lg px-2.5 py-1 text-[11px] font-semibold text-muted-foreground"
                        >
                          Quitar del calendario
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
