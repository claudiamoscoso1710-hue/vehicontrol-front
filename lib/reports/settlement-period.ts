import type { SupabaseClient } from "@supabase/supabase-js";
import { formatSettlementPeriod } from "@/lib/reports/driver-account-statement";

export type SettlementPeriodOption = {
  id: string;
  label: string;
  periodStart: string;
  periodEnd: string | null;
  isCurrent: boolean;
  settledAt: string | null;
};

export type SettlementPeriodContext = {
  periodId: string;
  isCurrent: boolean;
  periodStart: string;
  periodEnd: string | null;
  label: string;
  options: SettlementPeriodOption[];
};

export const CURRENT_PERIOD_ID = "current";

export function parsePeriodParam(value: string | undefined | null): string {
  if (!value || value === CURRENT_PERIOD_ID) return CURRENT_PERIOD_ID;
  return value;
}

export function formatPeriodRange(
  start: string,
  end: string | null,
  isCurrent: boolean
): string {
  const fmt = new Intl.DateTimeFormat("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const startLabel = fmt.format(new Date(start));
  if (isCurrent) {
    return `${startLabel} – hoy (período en curso)`;
  }
  if (!end) return startLabel;
  return formatSettlementPeriod(start, end);
}

function minDate(dates: (string | null | undefined)[]): string | null {
  const values = dates
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);

  if (values.length === 0) return null;
  return new Date(Math.min(...values)).toISOString();
}

function maxDate(dates: (string | null | undefined)[]): string | null {
  const values = dates
    .filter(Boolean)
    .map((value) => new Date(value as string).getTime())
    .filter(Number.isFinite);

  if (values.length === 0) return null;
  return new Date(Math.max(...values)).toISOString();
}

export async function loadDriverSettlementPeriods(
  supabase: SupabaseClient,
  organizationId: string,
  driverId: string
): Promise<SettlementPeriodOption[]> {
  const { data: settlements } = await supabase
    .from("driver_settlements")
    .select("id, period_start, period_end, settled_at")
    .eq("organization_id", organizationId)
    .eq("driver_id", driverId)
    .order("settled_at", { ascending: false });

  const [{ data: pendingTrips }, { data: pendingExpenses }, { data: pendingAdvances }] =
    await Promise.all([
      supabase
        .from("trips")
        .select("closed_at, created_at")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .is("settlement_id", null),
      supabase
        .from("expenses")
        .select("created_at")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .is("settlement_id", null),
      supabase
        .from("advances")
        .select("created_at")
        .eq("organization_id", organizationId)
        .eq("driver_id", driverId)
        .is("settlement_id", null),
    ]);

  const lastClosedEnd = settlements?.[0]?.period_end ?? null;

  const pendingDates = [
    ...(pendingTrips ?? []).flatMap((row) => [row.closed_at, row.created_at]),
    ...(pendingExpenses ?? []).map((row) => row.created_at),
    ...(pendingAdvances ?? []).map((row) => row.created_at),
  ];

  const inferredStart =
    minDate(pendingDates) ??
    (lastClosedEnd
      ? new Date(new Date(lastClosedEnd).getTime() + 1).toISOString()
      : new Date().toISOString());

  const closedOptions: SettlementPeriodOption[] = (settlements ?? []).map(
    (row, index) => ({
      id: row.id,
      label: `Período ${(settlements?.length ?? 0) - index} · ${formatSettlementPeriod(
        row.period_start,
        row.period_end
      )}`,
      periodStart: row.period_start,
      periodEnd: row.period_end,
      isCurrent: false,
      settledAt: row.settled_at,
    })
  );

  const hasPending =
    (pendingTrips?.length ?? 0) +
      (pendingExpenses?.length ?? 0) +
      (pendingAdvances?.length ?? 0) >
    0;

  const currentOption: SettlementPeriodOption = {
    id: CURRENT_PERIOD_ID,
    label: hasPending
      ? `Período actual · ${formatPeriodRange(inferredStart, null, true)}`
      : "Período actual · sin movimientos pendientes",
    periodStart: inferredStart,
    periodEnd: null,
    isCurrent: true,
    settledAt: null,
  };

  return [currentOption, ...closedOptions];
}

export async function resolveDriverPeriodContext(
  supabase: SupabaseClient,
  organizationId: string,
  driverId: string,
  periodParam?: string | null
): Promise<SettlementPeriodContext> {
  const options = await loadDriverSettlementPeriods(
    supabase,
    organizationId,
    driverId
  );
  const periodId = parsePeriodParam(periodParam);
  const selected =
    options.find((option) => option.id === periodId) ?? options[0];

  return {
    periodId: selected.id,
    isCurrent: selected.isCurrent,
    periodStart: selected.periodStart,
    periodEnd: selected.periodEnd,
    label: selected.isCurrent ? "Período actual" : selected.label,
    options,
  };
}

export function periodFilterForTrips(
  periodId: string,
  settlementId: string | null
) {
  if (periodId === CURRENT_PERIOD_ID) {
    return { column: "settlement_id" as const, op: "is" as const, value: null };
  }
  return { column: "settlement_id" as const, op: "eq" as const, value: settlementId ?? periodId };
}

export async function loadOrganizationSettlementPeriods(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SettlementPeriodOption[]> {
  const { data: settlements } = await supabase
    .from("driver_settlements")
    .select("id, period_start, period_end, settled_at, drivers(full_name)")
    .eq("organization_id", organizationId)
    .order("settled_at", { ascending: false });

  const [{ count: pendingExpenses }, { count: pendingTrips }, { count: pendingAdvances }] =
    await Promise.all([
    supabase
      .from("expenses")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("settlement_id", null),
    supabase
      .from("trips")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("settlement_id", null),
    supabase
      .from("advances")
      .select("id", { count: "exact", head: true })
      .eq("organization_id", organizationId)
      .is("settlement_id", null),
  ]);

  const [{ data: pendingTripsDates }, { data: pendingExpensesDates }, { data: pendingAdvancesDates }] =
    await Promise.all([
      supabase
        .from("trips")
        .select("closed_at, created_at")
        .eq("organization_id", organizationId)
        .is("settlement_id", null),
      supabase
        .from("expenses")
        .select("created_at")
        .eq("organization_id", organizationId)
        .is("settlement_id", null),
      supabase
        .from("advances")
        .select("created_at")
        .eq("organization_id", organizationId)
        .is("settlement_id", null),
    ]);

  const pendingDates = [
    ...(pendingTripsDates ?? []).flatMap((row) => [row.closed_at, row.created_at]),
    ...(pendingExpensesDates ?? []).map((row) => row.created_at),
    ...(pendingAdvancesDates ?? []).map((row) => row.created_at),
  ];

  const lastClosedEnd = settlements?.[0]?.period_end ?? null;
  const inferredStart =
    minDate(pendingDates) ??
    (lastClosedEnd
      ? new Date(new Date(lastClosedEnd).getTime() + 1).toISOString()
      : new Date().toISOString());

  const hasPending =
    (pendingExpenses ?? 0) + (pendingTrips ?? 0) + (pendingAdvances ?? 0) > 0;

  const closedOptions: SettlementPeriodOption[] = (settlements ?? []).map(
    (row, index) => {
      const driver = Array.isArray(row.drivers) ? row.drivers[0] : row.drivers;
      const driverName = driver?.full_name ?? "Conductor";
      return {
        id: row.id,
        label: `${driverName} · Período ${(settlements?.length ?? 0) - index} · ${formatSettlementPeriod(
          row.period_start,
          row.period_end
        )}`,
        periodStart: row.period_start,
        periodEnd: row.period_end,
        isCurrent: false,
        settledAt: row.settled_at,
      };
    }
  );

  const currentOption: SettlementPeriodOption = {
    id: CURRENT_PERIOD_ID,
    label: hasPending
      ? `Período actual · ${formatPeriodRange(inferredStart, null, true)}`
      : "Período actual · sin movimientos pendientes",
    periodStart: inferredStart,
    periodEnd: null,
    isCurrent: true,
    settledAt: null,
  };

  return [currentOption, ...closedOptions];
}

export async function resolveOrganizationPeriodContext(
  supabase: SupabaseClient,
  organizationId: string,
  periodParam?: string | null
): Promise<SettlementPeriodContext> {
  const options = await loadOrganizationSettlementPeriods(supabase, organizationId);
  const periodId = parsePeriodParam(periodParam);
  const selected =
    options.find((option) => option.id === periodId) ?? options[0];

  return {
    periodId: selected.id,
    isCurrent: selected.isCurrent,
    periodStart: selected.periodStart,
    periodEnd: selected.periodEnd,
    label: selected.isCurrent ? "Período actual" : selected.label,
    options,
  };
}
