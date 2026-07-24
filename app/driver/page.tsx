import { Suspense } from "react";
import { Route } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DriverExpenseReportSheet } from "@/components/driver/driver-expense-report-sheet";
import { DriverRegisterTripForm } from "@/components/driver/driver-register-trip-form";
import { DriverFinishTripButton } from "@/components/driver/driver-finish-trip-button";
import { DriverEditTripForm } from "@/components/driver/driver-edit-trip-form";
import { DriverExpenseList } from "@/components/driver/driver-expense-list";
import {
  DriverBalanceSection,
  DriverBalanceSectionFallback,
} from "@/components/driver/driver-balance-section";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
  DriverRouteVisual,
  DriverSectionCard,
  DriverStatChip,
  DriverStepIndicator,
} from "@/components/driver/driver-ui";

type TripRow = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freight_value: number | null;
  vehicles: { plate: string } | { plate: string }[] | null;
};

function getVehicle(trip: TripRow) {
  const v = trip.vehicles;
  return Array.isArray(v) ? v[0] : v;
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DriverPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: driverProfile } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id, organizations(name)")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const orgId = driverProfile?.organization_id;

  const { data: activeTrip } = orgId
    ? await supabase
        .from("trips")
        .select("id, origin, destination, status, freight_value, vehicles(plate)")
        .eq("driver_id", driverProfile.id)
        .eq("status", "in_progress")
        .maybeSingle()
    : { data: null };

  const { data: tripExpenses } =
    activeTrip && orgId
      ? await supabase
          .from("expenses")
          .select(
            "id, amount, status, notes, category_id, created_at, expense_categories(name)"
          )
          .eq("trip_id", activeTrip.id)
          .order("created_at", { ascending: false })
      : { data: null };

  const tripExpenseIds = (tripExpenses ?? []).map((expense) => expense.id);
  const { data: tripEvidences } =
    tripExpenseIds.length > 0
      ? await supabase
          .from("expense_evidences")
          .select("expense_id")
          .in("expense_id", tripExpenseIds)
      : { data: [] };
  const tripEvidenceSet = new Set(
    (tripEvidences ?? []).map((row) => row.expense_id)
  );
  const tripExpensesWithEvidence = (tripExpenses ?? []).map((expense) => ({
    ...expense,
    hasEvidence: tripEvidenceSet.has(expense.id),
  }));

  const { data: openAdvances } =
    activeTrip && orgId && driverProfile
      ? await supabase
          .from("advances")
          .select("amount, trip_id")
          .eq("driver_id", driverProfile.id)
          .eq("organization_id", orgId)
          .is("settlement_id", null)
      : { data: null };

  const advanceTotal = (openAdvances ?? [])
    .filter(
      (advance) =>
        advance.trip_id === activeTrip?.id || advance.trip_id === null
    )
    .reduce((sum, row) => sum + Number(row.amount), 0);

  const [{ data: categories }, { data: assignedVehicle }, { data: clients }] =
    orgId
    ? await Promise.all([
        supabase
          .from("expense_categories")
          .select("id, name")
          .eq("organization_id", orgId)
          .order("name"),
        supabase
          .from("vehicles")
          .select("id, plate, brand, operational_status")
          .eq("organization_id", orgId)
          .eq("assigned_driver_id", driverProfile!.id)
          .eq("commercial_status", "active")
          .maybeSingle(),
        supabase
          .from("clients")
          .select("id, name")
          .eq("organization_id", orgId)
          .order("name"),
      ])
    : [{ data: null }, { data: null }, { data: null }];

  const orgData = driverProfile?.organizations;
  const org = Array.isArray(orgData) ? orgData[0] : orgData;
  const firstName = driverProfile?.full_name?.split(" ")[0] ?? "conductor";
  const currentTrip = activeTrip as TripRow | null;
  const expenseTotal =
    tripExpensesWithEvidence.reduce((sum, row) => sum + Number(row.amount), 0) ?? 0;
  const stepIndex = currentTrip ? 1 : 0;

  return (
    <DriverPageContainer>
      <DriverPageHeader
        eyebrow={getGreeting()}
        title={`Hola, ${firstName}`}
        subtitle={
          org
            ? `${(org as { name: string }).name} · ${currentTrip ? "Viaje en curso" : "Listo para salir"}`
            : undefined
        }
      />

      {driverProfile && orgId ? (
        <Suspense fallback={<DriverBalanceSectionFallback />}>
          <DriverBalanceSection
            organizationId={orgId}
            driverId={driverProfile.id}
          />
        </Suspense>
      ) : null}

      {driverProfile && orgId ? (
        <>
          <DriverStepIndicator activeIndex={stepIndex} />

          {currentTrip ? (
            <>
              <section className="overflow-hidden rounded-2xl border border-brand/20 bg-gradient-to-br from-brand/10 via-card to-card shadow-md shadow-brand/5">
                <div className="border-b border-brand/10 px-4 py-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold uppercase tracking-wider text-brand">
                      Viaje activo
                    </p>
                    <StatusBadge status={currentTrip.status} />
                  </div>
                </div>

                <div className="space-y-4 p-4">
                  <DriverRouteVisual
                    origin={currentTrip.origin}
                    destination={currentTrip.destination}
                    plate={getVehicle(currentTrip)?.plate}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <DriverStatChip
                      label="Flete"
                      value={formatCurrency(Number(currentTrip.freight_value ?? 0))}
                      tone="brand"
                    />
                    <DriverStatChip
                      label="Gastos"
                      value={formatCurrency(expenseTotal)}
                      tone={expenseTotal > 0 ? "warning" : "neutral"}
                    />
                    <DriverStatChip
                      label="Anticipo"
                      value={formatCurrency(advanceTotal)}
                      tone={advanceTotal > 0 ? "success" : "neutral"}
                    />
                  </div>

                  <DriverEditTripForm
                    organizationId={orgId}
                    tripId={currentTrip.id}
                    origin={currentTrip.origin}
                    destination={currentTrip.destination}
                    freightValue={Number(currentTrip.freight_value ?? 0)}
                  />
                </div>
              </section>

              {categories && categories.length > 0 && (
                <DriverExpenseReportSheet
                  organizationId={orgId}
                  tripId={currentTrip.id}
                  categories={categories}
                  buttonHint="Peajes, combustible, parqueadero..."
                />
              )}

              <DriverSectionCard title="Cerrar viaje" icon={Route}>
                <DriverFinishTripButton
                  tripId={currentTrip.id}
                  organizationId={orgId}
                  expenseCount={tripExpensesWithEvidence.length}
                  expenseTotal={expenseTotal}
                />
              </DriverSectionCard>

              {tripExpensesWithEvidence.length > 0 && categories && (
                <DriverExpenseList
                  organizationId={orgId}
                  categories={categories}
                  expenses={tripExpensesWithEvidence}
                />
              )}
            </>
          ) : (
            <DriverSectionCard title="Nuevo viaje" icon={Route}>
              <DriverRegisterTripForm
                organizationId={orgId}
                assignedVehicle={
                  assignedVehicle
                    ? {
                        plate: assignedVehicle.plate,
                        brand: assignedVehicle.brand,
                      }
                    : null
                }
                clients={(clients ?? []).map((c) => ({
                  id: c.id,
                  label: c.name,
                }))}
              />
            </DriverSectionCard>
          )}
        </>
      ) : (
        <DriverEmptyState
          icon={Route}
          title="Perfil no configurado"
          description="Contacta a tu empresa para vincular tu usuario como conductor."
        />
      )}
    </DriverPageContainer>
  );
}
