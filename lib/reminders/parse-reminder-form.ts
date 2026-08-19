import type { ReminderRecurrenceUnit } from "@/lib/reminders/vehicle-expense-reminders";

function parseRecurrenceUnit(value: string): ReminderRecurrenceUnit | null {
  if (value === "days" || value === "weeks" || value === "months" || value === "years") {
    return value;
  }
  return null;
}

const REMINDER_FORM_KEYS = [
  "reminderEnabled",
  "reminderDueDate",
  "reminderRecurrenceUnit",
  "reminderRecurrenceInterval",
  "reminderAdvanceNoticeDays",
] as const;

/** Copia campos de recordatorio del formulario HTML al FormData del server action. */
export function appendReminderFieldsToFormData(
  target: FormData,
  source: FormData
) {
  for (const key of REMINDER_FORM_KEYS) {
    const value = source.get(key);
    if (value !== null && value !== "") {
      target.set(key, String(value));
    }
  }
}

export function readReminderQueueFields(source: FormData) {
  const enabled = source.get("reminderEnabled") === "true";
  if (!enabled) return {};

  return {
    reminderEnabled: true,
    reminderDueDate: String(source.get("reminderDueDate") ?? ""),
    reminderRecurrenceUnit: String(source.get("reminderRecurrenceUnit") ?? ""),
    reminderRecurrenceInterval: Number(source.get("reminderRecurrenceInterval") ?? 1),
    reminderAdvanceNoticeDays: Number(source.get("reminderAdvanceNoticeDays") ?? 3),
  };
}

export function parseReminderFromFormData(formData: FormData) {
  const enabled = formData.get("reminderEnabled") === "true";
  if (!enabled) return null;

  const dueDate = String(formData.get("reminderDueDate") ?? "").trim();
  const recurrenceUnit = parseRecurrenceUnit(String(formData.get("reminderRecurrenceUnit") ?? ""));
  const recurrenceInterval = Number(formData.get("reminderRecurrenceInterval") ?? 1);
  const advanceNoticeDays = Number(formData.get("reminderAdvanceNoticeDays") ?? 3);

  if (!dueDate || !recurrenceUnit || !recurrenceInterval || recurrenceInterval < 1) {
    return { error: "Completa la fecha y repetición del recordatorio." as const };
  }

  if (![1, 3, 5, 7].includes(advanceNoticeDays)) {
    return { error: "Selecciona cuándo avisar antes del vencimiento." as const };
  }

  return {
    dueDate,
    recurrenceUnit,
    recurrenceInterval,
    advanceNoticeDays,
  };
}
