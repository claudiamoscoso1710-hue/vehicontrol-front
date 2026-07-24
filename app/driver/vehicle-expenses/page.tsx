import { Car, Receipt } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { DriverExpenseReportSheet } from "@/components/driver/driver-expense-report-sheet";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import { loadDriverExpensesByPeriod } from "@/lib/reports/load-expenses-by-period";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
} from "@/components/driver/driver-ui";
import { VEHICLE_EXPENSE_CATEGORY_NAMES } from "@/lib/expenses/category-utils";

export default async function DriverVehicleExpensesPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: driverProfile } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  const orgId = driverProfile?.organization_id;

  const [{ data: allCategories }, { data: assignedVehicle }, expenseGroups] =
    orgId && driverProfile
      ? await Promise.all([
          supabase
            .from("expense_categories")
            .select("id, name")
            .eq("organization_id", orgId)
            .order("name"),
          supabase
            .from("vehicles")
            .select("id, plate, brand")
            .eq("organization_id", orgId)
            .eq("assigned_driver_id", driverProfile.id)
            .eq("commercial_status", "active")
            .maybeSingle(),
          loadDriverExpensesByPeriod(supabase, orgId, driverProfile.id, {
            vehicleOnly: true,
          }),
        ])
      : [{ data: null }, { data: null }, []];

  const vehicleCategories = (allCategories ?? []).filter((cat) =>
    VEHICLE_EXPENSE_CATEGORY_NAMES.some(
      (name) => name.toLowerCase() === cat.name.toLowerCase()
    )
  );

  return (
    <DriverPageContainer>
      <DriverPageHeader
        eyebrow="Flota"
        title="Gastos del vehículo"
        subtitle={
          driverProfile
            ? assignedVehicle
              ? `${driverProfile.full_name} · ${assignedVehicle.plate}`
              : `${driverProfile.full_name} · sin vehículo asignado`
            : undefined
        }
      />

      {!driverProfile || !orgId ? (
        <DriverEmptyState
          icon={Car}
          title="Perfil no configurado"
          description="Contacta a tu empresa para vincular tu usuario como conductor."
        />
      ) : vehicleCategories.length === 0 ? (
        <DriverEmptyState
          icon={Receipt}
          title="Sin categorías de vehículo"
          description="Pide a tu empresa que configure SOAT, rodamiento y demás gastos."
        />
      ) : !assignedVehicle ? (
        <DriverEmptyState
          icon={Car}
          title="Sin vehículo asignado"
          description="Pide a tu empresa que te asigne un vehículo en la flota."
        />
      ) : (
        <>
          <DriverExpenseReportSheet
            organizationId={orgId}
            categories={vehicleCategories}
            vehicleMode
            assignedVehicle={{
              plate: assignedVehicle.plate,
              brand: assignedVehicle.brand,
            }}
            buttonLabel="Reportar gasto del carro"
            sheetTitle="Gasto del vehículo"
            buttonHint="SOAT, rodamiento, mantenimiento..."
            submitLabel="Reportar gasto del vehículo"
          />

          <ExpensePeriodGroups
            groups={expenseGroups}
            variant="driver"
            emptyCurrentMessage="No tienes gastos del vehículo pendientes de liquidar."
            emptyHistoryMessage="Los gastos del vehículo liquidados aparecerán aquí por período."
          />
        </>
      )}
    </DriverPageContainer>
  );
}
