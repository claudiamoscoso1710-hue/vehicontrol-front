import { createClient } from "@/lib/supabase/server";
import { DriverHistoryTabs } from "@/components/driver/history-tabs";
import { loadDriverExpensesByPeriod } from "@/lib/reports/load-expenses-by-period";

export default async function DriverHistoryPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: driverProfile } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const { data: trips } = driverProfile
    ? await supabase
        .from("trips")
        .select("id, origin, destination, status, freight_value, created_at")
        .eq("driver_id", driverProfile.id)
        .order("created_at", { ascending: false })
        .limit(20)
    : { data: null };

  const tripIds = (trips ?? []).map((trip) => trip.id);

  const { data: tripExpenses } =
    tripIds.length > 0 && driverProfile
      ? await supabase
          .from("expenses")
          .select("id, amount, status, created_at, trip_id, expense_categories(name)")
          .eq("driver_id", driverProfile.id)
          .in("trip_id", tripIds)
          .order("created_at", { ascending: false })
      : { data: [] };

  const expenseGroups =
    driverProfile?.organization_id && driverProfile.id
      ? await loadDriverExpensesByPeriod(
          supabase,
          driverProfile.organization_id,
          driverProfile.id
        )
      : [];

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

  const expensesByTrip = new Map<string, typeof tripExpenses>();
  for (const expense of tripExpenses ?? []) {
    if (!expense.trip_id) continue;
    const current = expensesByTrip.get(expense.trip_id) ?? [];
    current.push(expense);
    expensesByTrip.set(expense.trip_id, current);
  }

  const tripsWithExpenses = (trips ?? []).map((trip) => ({
    ...trip,
    expenses: (expensesByTrip.get(trip.id) ?? []).map((expense) => ({
      ...expense,
      hasEvidence: evidenceSet.has(expense.id),
    })),
  }));

  const totalExpenseCount = expenseGroups.reduce(
    (sum, group) => sum + group.expenses.length,
    0
  );

  return (
    <DriverHistoryTabs
      driverName={driverProfile?.full_name ?? "Conductor"}
      trips={tripsWithExpenses}
      expenseGroups={expenseGroups}
      totalExpenseCount={totalExpenseCount}
    />
  );
}
