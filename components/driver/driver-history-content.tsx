import type { SupabaseClient } from "@supabase/supabase-js";
import type { DriverProfile } from "@/lib/auth/cached-auth";
import { DriverHistoryTabs } from "@/components/driver/history-tabs";
import { loadDriverExpensesByPeriod } from "@/lib/reports/load-expenses-by-period";

type Props = {
  driver: DriverProfile;
  supabase: SupabaseClient;
};

export async function DriverHistoryContent({ driver, supabase }: Props) {
  const [{ data: trips }, expenseGroups] = await Promise.all([
    supabase
      .from("trips")
      .select("id, origin, destination, status, freight_value, created_at")
      .eq("driver_id", driver.id)
      .order("created_at", { ascending: false })
      .limit(20),
    loadDriverExpensesByPeriod(supabase, driver.organization_id, driver.id),
  ]);

  const tripIds = (trips ?? []).map((trip) => trip.id);

  const { data: tripExpenses } =
    tripIds.length > 0
      ? await supabase
          .from("expenses")
          .select("id, amount, status, notes, additional_trip_expense, created_at, trip_id, expense_categories(name)")
          .eq("driver_id", driver.id)
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const expenseIds = [
    ...(tripExpenses ?? []).map((expense) => expense.id),
    ...expenseGroups.flatMap((group) => group.expenses.map((expense) => expense.id)),
  ];

  const uniqueExpenseIds = [...new Set(expenseIds)];
  const { data: evidences } =
    uniqueExpenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", uniqueExpenseIds)
      : { data: [] };

  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));

  type TripExpenseRow = {
    id: string;
    amount: number;
    status: string;
    notes: string | null;
    additional_trip_expense?: boolean | null;
    created_at: string;
    trip_id: string | null;
    expense_categories: { name: string } | { name: string }[] | null;
  };

  const expensesByTrip = new Map<string, TripExpenseRow[]>();
  for (const expense of (tripExpenses ?? []) as TripExpenseRow[]) {
    if (!expense.trip_id) continue;
    const current = expensesByTrip.get(expense.trip_id) ?? [];
    current.push(expense);
    expensesByTrip.set(expense.trip_id, current);
  }

  const tripsWithExpenses = (trips ?? []).map((trip) => ({
    ...trip,
    expenses: (expensesByTrip.get(trip.id) ?? []).map((expense) => ({
      ...expense,
      additional_trip_expense: Boolean(expense.additional_trip_expense),
      hasEvidence: evidenceSet.has(expense.id),
    })),
  }));

  const totalExpenseCount = expenseGroups.reduce(
    (sum, group) => sum + group.expenses.length,
    0
  );

  return (
    <DriverHistoryTabs
      driverName={driver.full_name}
      trips={tripsWithExpenses}
      expenseGroups={expenseGroups}
      totalExpenseCount={totalExpenseCount}
    />
  );
}
