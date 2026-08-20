import type { SupabaseClient } from "@supabase/supabase-js";

export type RegisterFreightResult =
  | { ok: true; freightValue: number; totalExpenses: number; margin: number }
  | { ok: false; error: string };

export async function registerTripFreight(
  supabase: SupabaseClient,
  organizationId: string,
  tripId: string
): Promise<RegisterFreightResult> {
  const { data: trip } = await supabase
    .from("trips")
    .select("id, freight_value, vehicle_id, status")
    .eq("id", tripId)
    .eq("organization_id", organizationId)
    .single();

  if (!trip) {
    return { ok: false, error: "Viaje no encontrado." };
  }

  if (trip.status !== "closed") {
    return { ok: false, error: "El viaje debe estar cerrado para registrar el flete." };
  }

  const freightValue = Number(trip.freight_value ?? 0);

  const { data: existingIncome } = await supabase
    .from("incomes")
    .select("id")
    .eq("trip_id", tripId)
    .eq("organization_id", organizationId)
    .maybeSingle();

  if (existingIncome) {
    const { data: expenses } = await supabase
      .from("expenses")
      .select("amount")
      .eq("trip_id", tripId)
      .eq("organization_id", organizationId)
      .eq("status", "approved");

    const totalExpenses =
      expenses?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;

    return {
      ok: true,
      freightValue,
      totalExpenses,
      margin: freightValue - totalExpenses,
    };
  }

  const { data: expenses } = await supabase
    .from("expenses")
    .select("amount")
    .eq("trip_id", tripId)
    .eq("organization_id", organizationId)
    .eq("status", "approved");

  const totalExpenses =
    expenses?.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const margin = freightValue - totalExpenses;

  if (freightValue > 0) {
    const { error: incomeError } = await supabase.from("incomes").insert({
      organization_id: organizationId,
      trip_id: tripId,
      vehicle_id: trip.vehicle_id,
      amount: freightValue,
      concept: "Flete del viaje",
    });

    if (incomeError) {
      return { ok: false, error: incomeError.message };
    }
  }

  return { ok: true, freightValue, totalExpenses, margin };
}
