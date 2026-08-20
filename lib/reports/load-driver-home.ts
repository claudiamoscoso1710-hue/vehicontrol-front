import type { SupabaseClient } from "@supabase/supabase-js";
import { cache } from "react";
import {
  calculateTripEarnings,
  DEFAULT_DRIVER_COMPENSATION,
  DRIVER_COMPENSATION_SETTING_KEY,
  getEffectiveCommissionPercent,
  parseDriverCompensationConfig,
} from "@/lib/settings/driver-compensation";
import { freightHeldFromTrip } from "@/lib/reports/driver-held-freight";
import { getOrganizationSetting } from "@/lib/settings/organization-settings";

export type DriverHomeTrip = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freightValue: number;
  vehiclePlate: string | null;
  clientId: string | null;
};

export type DriverHomeExpense = {
  id: string;
  amount: number;
  status: string;
  notes: string | null;
  categoryId: string;
  categoryName: string | null;
  createdAt: string;
  hasEvidence: boolean;
  ownerPrepaid?: boolean;
  additionalTripExpense?: boolean;
};

export type DriverHomeData = {
  driver: {
    id: string;
    organizationId: string;
    fullName: string;
    organizationName: string | null;
    commissionPercent: number;
  } | null;
  activeTrip: DriverHomeTrip | null;
  tripExpenses: DriverHomeExpense[];
  openAdvanceTotal: number;
  categories: { id: string; name: string }[];
  assignedVehicle: {
    id: string;
    plate: string;
    brand: string | null;
    operationalStatus: string | null;
  } | null;
  clients: { id: string; name: string }[];
  balance: {
    totalEarnings: number;
    totalExpenses: number;
    totalAdvances: number;
    netBalance: number;
    hasPendingItems: boolean;
  };
};

function emptyHome(): DriverHomeData {
  return {
    driver: null,
    activeTrip: null,
    tripExpenses: [],
    openAdvanceTotal: 0,
    categories: [],
    assignedVehicle: null,
    clients: [],
    balance: {
      totalEarnings: 0,
      totalExpenses: 0,
      totalAdvances: 0,
      netBalance: 0,
      hasPendingItems: false,
    },
  };
}

function parseHome(raw: unknown): DriverHomeData {
  if (!raw || typeof raw !== "object") return emptyHome();
  const data = raw as DriverHomeData;
  return {
    driver: data.driver ?? null,
    activeTrip: data.activeTrip
      ? {
          ...data.activeTrip,
          clientId:
            (data.activeTrip as { clientId?: string | null }).clientId ?? null,
        }
      : null,
    tripExpenses: Array.isArray(data.tripExpenses) ? data.tripExpenses : [],
    openAdvanceTotal: Number(data.openAdvanceTotal ?? 0),
    categories: Array.isArray(data.categories) ? data.categories : [],
    assignedVehicle: data.assignedVehicle ?? null,
    clients: Array.isArray(data.clients) ? data.clients : [],
    balance: {
      totalEarnings: Number(data.balance?.totalEarnings ?? 0),
      totalExpenses: Number(data.balance?.totalExpenses ?? 0),
      totalAdvances: Number(data.balance?.totalAdvances ?? 0),
      netBalance: Number(data.balance?.netBalance ?? 0),
      hasPendingItems: Boolean(data.balance?.hasPendingItems),
    },
  };
}

function isMissingRpc(error: { message?: string; code?: string } | null) {
  const message = error?.message?.toLowerCase() ?? "";
  return (
    error?.code === "PGRST202" ||
    message.includes("could not find the function") ||
    message.includes("get_driver_home")
  );
}

/** Una sola RPC. Si la migración aún no está aplicada, usa el fallback. */
export const loadDriverHome = cache(async function loadDriverHome(
  supabase: SupabaseClient
): Promise<DriverHomeData> {
  const { data, error } = await supabase.rpc("get_driver_home");

  if (!error) {
    return parseHome(data);
  }

  if (!isMissingRpc(error)) {
    console.error("get_driver_home failed", error.message);
    return emptyHome();
  }

  return loadDriverHomeFallback(supabase);
});

async function loadDriverHomeFallback(
  supabase: SupabaseClient
): Promise<DriverHomeData> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  if (!user) return emptyHome();

  const { data: driverProfile } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id, commission_percent, organizations(name)")
    .eq("user_id", user.id)
    .eq("status", "active")
    .maybeSingle();

  if (!driverProfile) return emptyHome();

  const orgId = driverProfile.organization_id;
  const orgData = driverProfile.organizations;
  const org = Array.isArray(orgData) ? orgData[0] : orgData;

  const [
    { data: activeTrip },
    { data: assignedVehicle },
    { data: categories },
    { data: clients },
    { data: openAdvances },
    { data: closedTrips },
    { data: pendingExpenses },
  ] = await Promise.all([
    supabase
      .from("trips")
      .select("id, origin, destination, status, freight_value, client_id, vehicles(plate)")
      .eq("driver_id", driverProfile.id)
      .eq("status", "in_progress")
      .maybeSingle(),
    supabase
      .from("vehicles")
      .select("id, plate, brand, operational_status")
      .eq("organization_id", orgId)
      .eq("assigned_driver_id", driverProfile.id)
      .eq("commercial_status", "active")
      .maybeSingle(),
    supabase
      .from("expense_categories")
      .select("id, name, scope")
      .eq("organization_id", orgId)
      .eq("scope", "trip")
      .order("name"),
    supabase
      .from("clients")
      .select("id, name")
      .eq("organization_id", orgId)
      .order("name"),
    supabase
      .from("advances")
      .select("amount, trip_id")
      .eq("driver_id", driverProfile.id)
      .eq("organization_id", orgId)
      .is("settlement_id", null),
    supabase
      .from("trips")
      .select("id, freight_value, client_id")
      .eq("driver_id", driverProfile.id)
      .eq("organization_id", orgId)
      .eq("status", "closed")
      .is("settlement_id", null),
    supabase
      .from("expenses")
      .select("amount, trip_id, additional_trip_expense")
      .eq("driver_id", driverProfile.id)
      .eq("organization_id", orgId)
      .eq("status", "approved")
      .is("settlement_id", null),
  ]);

  const tripId = activeTrip?.id ?? null;
  const { data: tripExpenses } = tripId
    ? await supabase
        .from("expenses")
        .select(
          "id, amount, status, notes, owner_prepaid, additional_trip_expense, category_id, created_at, expense_categories(name)"
        )
        .eq("trip_id", tripId)
        .order("created_at", { ascending: false })
    : { data: [] };

  const expenseIds = (tripExpenses ?? []).map((row) => row.id);
  const { data: evidences } =
    expenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", expenseIds)
      : { data: [] };
  const evidenceSet = new Set((evidences ?? []).map((row) => row.expense_id));

  const vehicle = Array.isArray(activeTrip?.vehicles)
    ? activeTrip?.vehicles[0]
    : activeTrip?.vehicles;

  const orgConfig = await getOrganizationSetting(
    supabase,
    orgId,
    DRIVER_COMPENSATION_SETTING_KEY,
    parseDriverCompensationConfig,
    DEFAULT_DRIVER_COMPENSATION
  );

  const commission = getEffectiveCommissionPercent(
    orgConfig,
    driverProfile.commission_percent
  );

  const tripExpenseTotals = new Map<string, number>();
  const tripSalaryExpenseTotals = new Map<string, number>();
  for (const expense of pendingExpenses ?? []) {
    if (!expense.trip_id) continue;
    const amount = Number(expense.amount);
    tripExpenseTotals.set(
      expense.trip_id,
      (tripExpenseTotals.get(expense.trip_id) ?? 0) + amount
    );
    if (!expense.additional_trip_expense) {
      tripSalaryExpenseTotals.set(
        expense.trip_id,
        (tripSalaryExpenseTotals.get(expense.trip_id) ?? 0) + amount
      );
    }
  }

  const totalEarnings = (closedTrips ?? []).reduce((sum, trip) => {
    const freight = Number(trip.freight_value ?? 0);
    const salaryExpenses = tripSalaryExpenseTotals.get(trip.id) ?? 0;
    return (
      sum +
      calculateTripEarnings(
        freight,
        salaryExpenses,
        commission,
        orgConfig.salary_basis
      )
    );
  }, 0);
  const totalExpenses = (pendingExpenses ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const totalFreightHeld = (closedTrips ?? []).reduce(
    (sum, trip) => sum + freightHeldFromTrip(trip.client_id, trip.freight_value),
    0
  );
  const totalAdvances = (openAdvances ?? []).reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const openAdvanceTotal = (openAdvances ?? [])
    .filter((row) => row.trip_id === tripId || row.trip_id === null)
    .reduce((sum, row) => sum + Number(row.amount), 0);

  return {
    driver: {
      id: driverProfile.id,
      organizationId: orgId,
      fullName: driverProfile.full_name,
      organizationName: (org as { name: string } | null)?.name ?? null,
      commissionPercent: commission,
    },
    activeTrip: activeTrip
      ? {
          id: activeTrip.id,
          origin: activeTrip.origin,
          destination: activeTrip.destination,
          status: activeTrip.status,
          freightValue: Number(activeTrip.freight_value ?? 0),
          vehiclePlate: (vehicle as { plate: string } | null)?.plate ?? null,
          clientId: activeTrip.client_id ?? null,
        }
      : null,
    tripExpenses: (tripExpenses ?? []).map((expense) => {
      const category = Array.isArray(expense.expense_categories)
        ? expense.expense_categories[0]
        : expense.expense_categories;
      return {
        id: expense.id,
        amount: Number(expense.amount),
        status: expense.status,
        notes: expense.notes,
        ownerPrepaid: Boolean(expense.owner_prepaid),
        additionalTripExpense: Boolean(expense.additional_trip_expense),
        categoryId: expense.category_id,
        categoryName: (category as { name: string } | null)?.name ?? null,
        createdAt: expense.created_at,
        hasEvidence: evidenceSet.has(expense.id),
      };
    }),
    openAdvanceTotal,
    categories: categories ?? [],
    assignedVehicle: assignedVehicle
      ? {
          id: assignedVehicle.id,
          plate: assignedVehicle.plate,
          brand: assignedVehicle.brand,
          operationalStatus: assignedVehicle.operational_status,
        }
      : null,
    clients: clients ?? [],
    balance: {
      totalEarnings,
      totalExpenses,
      totalAdvances,
      netBalance: totalEarnings + totalExpenses - totalFreightHeld - totalAdvances,
      hasPendingItems:
        (closedTrips ?? []).length > 0 ||
        (pendingExpenses ?? []).length > 0 ||
        (openAdvances ?? []).length > 0,
    },
  };
}
