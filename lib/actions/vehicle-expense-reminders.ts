"use server";

import { revalidatePath } from "next/cache";
import {
  addRecurrence,
  type ReminderRecurrenceUnit,
} from "@/lib/reminders/vehicle-expense-reminders";
import { requireRole, RoleError } from "@/lib/permissions/checkRole";
import { createClient } from "@/lib/supabase/server";

export type ReminderActionResult =
  | { success: true }
  | { success: false; error: string };

export async function upsertVehicleExpenseReminder(params: {
  organizationId: string;
  vehicleId: string;
  driverId: string;
  categoryId: string;
  label: string;
  notes?: string | null;
  dueDate: string;
  recurrenceInterval: number;
  recurrenceUnit: ReminderRecurrenceUnit;
  advanceNoticeDays: number;
  sourceExpenseId?: string | null;
}): Promise<ReminderActionResult> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("vehicle_expense_reminders")
    .select("id")
    .eq("vehicle_id", params.vehicleId)
    .eq("category_id", params.categoryId)
    .eq("dismissed_permanently", false)
    .maybeSingle();

  const payload = {
    organization_id: params.organizationId,
    vehicle_id: params.vehicleId,
    driver_id: params.driverId,
    category_id: params.categoryId,
    label: params.label,
    notes: params.notes ?? null,
    due_date: params.dueDate,
    recurrence_interval: params.recurrenceInterval,
    recurrence_unit: params.recurrenceUnit,
    advance_notice_days: params.advanceNoticeDays,
    dismissed_permanently: false,
    snoozed_until: null,
    banner_dismissed_for_due_date: null,
    source_expense_id: params.sourceExpenseId ?? null,
    updated_at: new Date().toISOString(),
  };

  if (existing) {
    const { error } = await supabase
      .from("vehicle_expense_reminders")
      .update(payload)
      .eq("id", existing.id);
    if (error) return { success: false, error: error.message };
  } else {
    const { error } = await supabase.from("vehicle_expense_reminders").insert(payload);
    if (error) return { success: false, error: error.message };
  }

  revalidateReminderPaths();
  return { success: true };
}

export async function snoozeVehicleExpenseReminder(
  reminderId: string,
  organizationId: string
): Promise<ReminderActionResult> {
  try {
    const supabase = await createClient();
    await requireRole(supabase, organizationId, ["driver"]);

    const snoozedUntil = new Date();
    snoozedUntil.setDate(snoozedUntil.getDate() + 1);

    const { error } = await supabase
      .from("vehicle_expense_reminders")
      .update({
        snoozed_until: snoozedUntil.toISOString(),
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminderId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };
    revalidateReminderPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) return { success: false, error: error.message };
    return { success: false, error: "No se pudo posponer el recordatorio." };
  }
}

export async function dismissReminderBanner(
  reminderId: string,
  organizationId: string,
  dueDate: string
): Promise<ReminderActionResult> {
  try {
    const supabase = await createClient();
    await requireRole(supabase, organizationId, ["driver"]);

    const { error } = await supabase
      .from("vehicle_expense_reminders")
      .update({
        banner_dismissed_for_due_date: dueDate,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminderId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };
    revalidateReminderPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) return { success: false, error: error.message };
    return { success: false, error: "No se pudo ocultar el aviso." };
  }
}

export async function dismissVehicleExpenseReminder(
  reminderId: string,
  organizationId: string
): Promise<ReminderActionResult> {
  try {
    const supabase = await createClient();
    await requireRole(supabase, organizationId, ["driver"]);

    const { error } = await supabase
      .from("vehicle_expense_reminders")
      .update({
        dismissed_permanently: true,
        snoozed_until: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", reminderId)
      .eq("organization_id", organizationId);

    if (error) return { success: false, error: error.message };
    revalidateReminderPaths();
    return { success: true };
  } catch (error) {
    if (error instanceof RoleError) return { success: false, error: error.message };
    return { success: false, error: "No se pudo descartar el recordatorio." };
  }
}

export async function advanceReminderAfterExpense(params: {
  organizationId: string;
  vehicleId: string;
  categoryId: string;
  expenseId: string;
}): Promise<void> {
  const supabase = await createClient();

  const { data: reminder } = await supabase
    .from("vehicle_expense_reminders")
    .select("id, due_date, recurrence_interval, recurrence_unit")
    .eq("vehicle_id", params.vehicleId)
    .eq("category_id", params.categoryId)
    .eq("dismissed_permanently", false)
    .maybeSingle();

  if (!reminder) return;

  const nextDue = addRecurrence(
    reminder.due_date,
    reminder.recurrence_interval,
    reminder.recurrence_unit as ReminderRecurrenceUnit
  );

  await supabase
    .from("vehicle_expense_reminders")
    .update({
      due_date: nextDue,
      snoozed_until: null,
      banner_dismissed_for_due_date: null,
      source_expense_id: params.expenseId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", reminder.id)
    .eq("organization_id", params.organizationId);
}

function revalidateReminderPaths() {
  revalidatePath("/driver");
  revalidatePath("/driver/vehicle-expenses");
  revalidatePath("/driver/reminders");
}
