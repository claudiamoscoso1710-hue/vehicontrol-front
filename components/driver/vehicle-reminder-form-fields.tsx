"use client";

import { useMemo, useState } from "react";
import {
  ADVANCE_NOTICE_OPTIONS,
  RECURRENCE_PRESETS,
  type ReminderRecurrenceUnit,
} from "@/lib/reminders/vehicle-expense-reminders";
import { driverFieldClassName } from "@/components/driver/driver-ui";

type Props = {
  categoryLabel?: string;
};

export function VehicleReminderFormFields({ categoryLabel }: Props) {
  const [enabled, setEnabled] = useState(false);
  const [presetId, setPresetId] = useState("yearly");
  const [customInterval, setCustomInterval] = useState(3);

  const preset = RECURRENCE_PRESETS.find((item) => item.id === presetId) ?? RECURRENCE_PRESETS[4];

  const recurrenceUnit: ReminderRecurrenceUnit = preset.unit;
  const recurrenceInterval =
    "customInterval" in preset && preset.customInterval ? customInterval : preset.interval;

  const defaultDueDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() + 1);
    return date.toISOString().slice(0, 10);
  }, []);

  return (
    <div className="space-y-3 rounded-2xl border border-violet-200/70 bg-violet-50/60 px-4 py-4">
      <input type="hidden" name="reminderEnabled" value={enabled ? "true" : "false"} />
      <input type="hidden" name="reminderRecurrenceUnit" value={recurrenceUnit} />
      <input
        type="hidden"
        name="reminderRecurrenceInterval"
        value={String(recurrenceInterval)}
      />

      <label className="flex cursor-pointer items-start gap-3">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="mt-1 h-4 w-4 rounded border-border text-violet-600 focus:ring-violet-500"
        />
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-violet-950">
            Configurar recordatorio
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-violet-900/80">
            Para SOAT, tecnomecánica, rodamiento y otros pagos periódicos del vehículo.
            {categoryLabel ? ` (${categoryLabel})` : null}
          </span>
        </span>
      </label>

      {enabled ? (
        <div className="space-y-3 border-t border-violet-200/60 pt-3">
          <div className="space-y-1.5">
            <label htmlFor="reminderDueDate" className="text-sm font-semibold text-violet-950">
              Próximo vencimiento
            </label>
            <input
              id="reminderDueDate"
              name="reminderDueDate"
              type="date"
              required={enabled}
              defaultValue={defaultDueDate}
              className={driverFieldClassName()}
            />
          </div>

          <div className="space-y-1.5">
            <label htmlFor="reminderPreset" className="text-sm font-semibold text-violet-950">
              Repetir
            </label>
            <select
              id="reminderPreset"
              value={presetId}
              onChange={(e) => setPresetId(e.target.value)}
              className={driverFieldClassName()}
            >
              {RECURRENCE_PRESETS.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.label}
                </option>
              ))}
            </select>
          </div>

          {"customInterval" in preset && preset.customInterval ? (
            <div className="space-y-1.5">
              <label htmlFor="reminderCustomInterval" className="text-sm font-semibold text-violet-950">
                Cada cuántos {preset.unit === "days" ? "días" : "meses"}
              </label>
              <input
                id="reminderCustomInterval"
                type="number"
                min={1}
                max={preset.unit === "days" ? 365 : 24}
                value={customInterval}
                onChange={(e) => setCustomInterval(Number(e.target.value) || 1)}
                className={driverFieldClassName()}
              />
            </div>
          ) : null}

          <div className="space-y-1.5">
            <label htmlFor="reminderAdvanceNoticeDays" className="text-sm font-semibold text-violet-950">
              Avisar con anticipación
            </label>
            <select
              id="reminderAdvanceNoticeDays"
              name="reminderAdvanceNoticeDays"
              defaultValue={3}
              className={driverFieldClassName()}
            >
              {ADVANCE_NOTICE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      ) : null}
    </div>
  );
}
