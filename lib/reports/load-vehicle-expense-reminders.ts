import type { SupabaseClient } from "@supabase/supabase-js";
import {
  mapReminderRow,
  type VehicleExpenseReminder,
  type VehicleExpenseReminderRow,
} from "@/lib/reminders/vehicle-expense-reminders";

export async function loadDriverVehicleExpenseReminders(
  supabase: SupabaseClient,
  driverId: string
): Promise<VehicleExpenseReminder[]> {
  const { data, error } = await supabase
    .from("vehicle_expense_reminders")
    .select(
      "id, organization_id, vehicle_id, driver_id, category_id, label, notes, due_date, recurrence_interval, recurrence_unit, advance_notice_days, dismissed_permanently, snoozed_until, banner_dismissed_for_due_date, source_expense_id, created_at, updated_at, vehicles(plate)"
    )
    .eq("driver_id", driverId)
    .eq("dismissed_permanently", false)
    .order("due_date", { ascending: true });

  if (error) {
    console.error("loadDriverVehicleExpenseReminders", error.message);
    return [];
  }

  return (data ?? []).map((row) => {
    const vehicle = Array.isArray(row.vehicles) ? row.vehicles[0] : row.vehicles;
    return mapReminderRow({
      ...(row as VehicleExpenseReminderRow),
      vehicle_plate: (vehicle as { plate: string } | null)?.plate ?? null,
    });
  });
}
