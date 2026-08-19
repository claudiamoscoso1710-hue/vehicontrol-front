export type ReminderRecurrenceUnit = "days" | "weeks" | "months" | "years";

export type VehicleExpenseReminderRow = {
  id: string;
  organization_id: string;
  vehicle_id: string;
  driver_id: string;
  category_id: string | null;
  label: string;
  notes: string | null;
  due_date: string;
  recurrence_interval: number;
  recurrence_unit: ReminderRecurrenceUnit;
  advance_notice_days: number;
  dismissed_permanently: boolean;
  snoozed_until: string | null;
  banner_dismissed_for_due_date?: string | null;
  source_expense_id: string | null;
  created_at: string;
  updated_at: string;
  vehicle_plate?: string | null;
};

export type VehicleExpenseReminder = {
  id: string;
  organizationId: string;
  vehicleId: string;
  driverId: string;
  categoryId: string | null;
  label: string;
  notes: string | null;
  dueDate: string;
  recurrenceInterval: number;
  recurrenceUnit: ReminderRecurrenceUnit;
  advanceNoticeDays: number;
  dismissedPermanently: boolean;
  snoozedUntil: string | null;
  bannerDismissedForDueDate: string | null;
  vehiclePlate: string | null;
};

export const ADVANCE_NOTICE_OPTIONS = [
  { value: 1, label: "1 día antes" },
  { value: 3, label: "3 días antes" },
  { value: 5, label: "5 días antes" },
  { value: 7, label: "1 semana antes" },
] as const;

export const RECURRENCE_PRESETS = [
  { id: "weekly", label: "Cada semana", interval: 1, unit: "weeks" as const },
  { id: "monthly", label: "Cada mes", interval: 1, unit: "months" as const },
  { id: "every_n_months", label: "Cada X meses", interval: 3, unit: "months" as const, customInterval: true },
  { id: "every_n_days", label: "Cada X días", interval: 30, unit: "days" as const, customInterval: true },
  { id: "yearly", label: "Cada año", interval: 1, unit: "years" as const },
] as const;

function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDateOnly(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function addRecurrence(
  dueDate: string,
  interval: number,
  unit: ReminderRecurrenceUnit
): string {
  const date = parseDateOnly(dueDate);
  switch (unit) {
    case "days":
      date.setDate(date.getDate() + interval);
      break;
    case "weeks":
      date.setDate(date.getDate() + interval * 7);
      break;
    case "months":
      date.setMonth(date.getMonth() + interval);
      break;
    case "years":
      date.setFullYear(date.getFullYear() + interval);
      break;
  }
  return formatDateOnly(date);
}

export function getReminderWindowStart(dueDate: string, advanceNoticeDays: number): Date {
  const due = parseDateOnly(dueDate);
  const start = new Date(due);
  start.setDate(start.getDate() - advanceNoticeDays);
  return start;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function isReminderSnoozed(reminder: Pick<VehicleExpenseReminder, "snoozedUntil">): boolean {
  if (!reminder.snoozedUntil) return false;
  return new Date(reminder.snoozedUntil) > new Date();
}

/** Banner activo: dentro de la ventana de aviso y antes o el día del vencimiento. */
export function isReminderBannerActive(
  reminder: Pick<
    VehicleExpenseReminder,
    | "dueDate"
    | "advanceNoticeDays"
    | "dismissedPermanently"
    | "snoozedUntil"
    | "bannerDismissedForDueDate"
  >,
  today: Date = startOfToday()
): boolean {
  if (reminder.dismissedPermanently) return false;
  if (reminder.bannerDismissedForDueDate === reminder.dueDate) return false;
  if (isReminderSnoozed(reminder)) return false;

  const due = parseDateOnly(reminder.dueDate);
  if (today > due) return false;

  const windowStart = getReminderWindowStart(reminder.dueDate, reminder.advanceNoticeDays);
  return today >= windowStart;
}

/** Visible en campana/calendario: pendientes no descartados y aún no vencidos. */
export function isReminderPending(
  reminder: Pick<VehicleExpenseReminder, "dueDate" | "dismissedPermanently">,
  today: Date = startOfToday()
): boolean {
  if (reminder.dismissedPermanently) return false;
  const due = parseDateOnly(reminder.dueDate);
  return today <= due;
}

export function getRecurrenceLabel(interval: number, unit: ReminderRecurrenceUnit): string {
  if (unit === "weeks" && interval === 1) return "Cada semana";
  if (unit === "months" && interval === 1) return "Cada mes";
  if (unit === "years" && interval === 1) return "Cada año";
  if (unit === "months") return `Cada ${interval} meses`;
  if (unit === "days") return `Cada ${interval} días`;
  if (unit === "weeks") return `Cada ${interval} semanas`;
  return `Cada ${interval} años`;
}

export function mapReminderRow(row: VehicleExpenseReminderRow): VehicleExpenseReminder {
  return {
    id: row.id,
    organizationId: row.organization_id,
    vehicleId: row.vehicle_id,
    driverId: row.driver_id,
    categoryId: row.category_id,
    label: row.label,
    notes: row.notes,
    dueDate: row.due_date,
    recurrenceInterval: row.recurrence_interval,
    recurrenceUnit: row.recurrence_unit,
    advanceNoticeDays: row.advance_notice_days,
    dismissedPermanently: row.dismissed_permanently,
    snoozedUntil: row.snoozed_until,
    bannerDismissedForDueDate: row.banner_dismissed_for_due_date ?? null,
    vehiclePlate: row.vehicle_plate ?? null,
  };
}
