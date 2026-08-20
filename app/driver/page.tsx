import { Route } from "lucide-react";
import { getAuthSupabase } from "@/lib/auth/cached-auth";
import { DriverExpenseReportSheet } from "@/components/driver/driver-expense-report-sheet";
import { DriverRegisterTripForm } from "@/components/driver/driver-register-trip-form";
import { DriverFinishTripButton } from "@/components/driver/driver-finish-trip-button";
import { DriverEditTripForm } from "@/components/driver/driver-edit-trip-form";
import { DriverExpenseList } from "@/components/driver/driver-expense-list";
import { DriverBalanceCard } from "@/components/driver/driver-balance-card";
import { DriverHomeSnapshot } from "@/components/driver/driver-home-snapshot";
import { formatCurrency } from "@/lib/format";
import { DRIVER_HELD_FREIGHT_ACTIVE_HINT } from "@/lib/reports/driver-held-freight";
import { driverHoldsFreight } from "@/lib/reports/driver-held-freight";
import { StatusBadge } from "@/components/ui/status-badge";
import { loadDriverHome } from "@/lib/reports/load-driver-home";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
  DriverRouteVisual,
  DriverSectionCard,
  DriverStatChip,
  DriverStepIndicator,
} from "@/components/driver/driver-ui";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Buenos días";
  if (hour < 18) return "Buenas tardes";
  return "Buenas noches";
}

export default async function DriverPage() {
  const supabase = await getAuthSupabase();
  const home = await loadDriverHome(supabase);

  const driver = home.driver;
  const currentTrip = home.activeTrip;
  const firstName = driver?.fullName.split(" ")[0] ?? "conductor";
  const expenseTotal = home.tripExpenses.reduce(
    (sum, row) => sum + Number(row.amount),
    0
  );
  const stepIndex = currentTrip ? 1 : 0;

  return (
    <DriverPageContainer>
      <DriverHomeSnapshot data={home} />
      <DriverPageHeader
        eyebrow={getGreeting()}
        title={`Hola, ${firstName}`}
        subtitle={
          driver?.organizationName
            ? `${driver.organizationName} · ${currentTrip ? "Viaje en curso" : "Listo para salir"}`
            : undefined
        }
      />

      {driver ? (
        <DriverBalanceCard
          netBalance={home.balance.netBalance}
          hasPendingItems={home.balance.hasPendingItems}
        />
      ) : null}

      {driver ? (
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
                    plate={currentTrip.vehiclePlate ?? undefined}
                  />

                  {driverHoldsFreight(currentTrip.clientId) ? (
                    <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
                      <p className="font-semibold">Flete en tu poder</p>
                      <p className="mt-1 text-orange-900/90">
                        {DRIVER_HELD_FREIGHT_ACTIVE_HINT}
                      </p>
                    </div>
                  ) : null}

                  <div className="grid grid-cols-3 gap-2">
                    <DriverStatChip
                      label="Flete"
                      value={formatCurrency(Number(currentTrip.freightValue ?? 0))}
                      tone="brand"
                    />
                    <DriverStatChip
                      label="Gastos"
                      value={formatCurrency(expenseTotal)}
                      tone={expenseTotal > 0 ? "warning" : "neutral"}
                    />
                    <DriverStatChip
                      label="Anticipo"
                      value={formatCurrency(home.openAdvanceTotal)}
                      tone={home.openAdvanceTotal > 0 ? "success" : "neutral"}
                    />
                  </div>

                  <DriverEditTripForm
                    organizationId={driver.organizationId}
                    tripId={currentTrip.id}
                    origin={currentTrip.origin}
                    destination={currentTrip.destination}
                    freightValue={Number(currentTrip.freightValue ?? 0)}
                  />
                </div>
              </section>

              {home.categories.length > 0 && (
                <DriverExpenseReportSheet
                  organizationId={driver.organizationId}
                  tripId={currentTrip.id}
                  categories={home.categories}
                  buttonHint="Peajes, combustible, parqueadero..."
                />
              )}
              <DriverExpenseReportSheet
                organizationId={driver.organizationId}
                tripId={currentTrip.id}
                categories={[]}
                additionalMode
                buttonLabel="Reportar gasto adicional"
                sheetTitle="Gasto adicional del viaje"
                submitLabel="Enviar gasto adicional"
                buttonHint="Reembolsable, no afecta tu sueldo · solo texto libre"
              />

              <DriverSectionCard title="Cerrar viaje" icon={Route}>
                <DriverFinishTripButton
                  tripId={currentTrip.id}
                  organizationId={driver.organizationId}
                  expenseCount={home.tripExpenses.length}
                  expenseTotal={expenseTotal}
                />
              </DriverSectionCard>

              {home.tripExpenses.length > 0 && (
                <DriverExpenseList
                  organizationId={driver.organizationId}
                  categories={home.categories}
                  expenses={home.tripExpenses.map((expense) => ({
                    id: expense.id,
                    amount: expense.amount,
                    notes: expense.notes,
                    owner_prepaid: expense.ownerPrepaid,
                    additional_trip_expense: expense.additionalTripExpense,
                    created_at: expense.createdAt,
                    category_id: expense.categoryId,
                    hasEvidence: expense.hasEvidence,
                    expense_categories: expense.categoryName
                      ? { name: expense.categoryName }
                      : null,
                  }))}
                />
              )}
            </>
          ) : (
            <DriverSectionCard title="Nuevo viaje" icon={Route}>
              <DriverRegisterTripForm
                organizationId={driver.organizationId}
                assignedVehicle={
                  home.assignedVehicle
                    ? {
                        plate: home.assignedVehicle.plate,
                        brand: home.assignedVehicle.brand,
                      }
                    : null
                }
                clients={home.clients.map((client) => ({
                  id: client.id,
                  label: client.name,
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
