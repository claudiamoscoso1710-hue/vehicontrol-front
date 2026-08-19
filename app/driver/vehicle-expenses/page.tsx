import { Car, Receipt } from "lucide-react";
import { getDriverContext } from "@/lib/auth/cached-auth";
import { DriverExpenseReportSheet } from "@/components/driver/driver-expense-report-sheet";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import { loadDriverExpensesByPeriod } from "@/lib/reports/load-expenses-by-period";
import {
  DriverEmptyState,
  DriverPageContainer,
  DriverPageHeader,
} from "@/components/driver/driver-ui";
import { filterCategoriesByScope } from "@/lib/expenses/expense-scope";

export default async function DriverVehicleExpensesPage() {
  const ctx = await getDriverContext();

  if (!ctx) {
    return (
      <DriverPageContainer>
        <DriverEmptyState
          icon={Car}
          title="Perfil no configurado"
          description="Contacta a tu empresa para vincular tu usuario como conductor."
        />
      </DriverPageContainer>
    );
  }

  const { supabase, driver } = ctx;
  const orgId = driver.organization_id;

  const [{ data: allCategories }, { data: assignedVehicle }, expenseGroups] =
    await Promise.all([
      supabase
        .from("expense_categories")
        .select("id, name, scope")
        .eq("organization_id", orgId)
        .eq("scope", "vehicle")
        .order("name"),
      supabase
        .from("vehicles")
        .select("id, plate, brand")
        .eq("organization_id", orgId)
        .eq("assigned_driver_id", driver.id)
        .eq("commercial_status", "active")
        .maybeSingle(),
      loadDriverExpensesByPeriod(supabase, orgId, driver.id, {
        vehicleOnly: true,
      }),
    ]);

  const vehicleCategories = filterCategoriesByScope(allCategories ?? [], "vehicle");

  return (
    <DriverPageContainer>
      <DriverPageHeader
        eyebrow="Flota"
        title="Gastos del vehículo"
        subtitle={
          assignedVehicle
            ? `${driver.full_name} · ${assignedVehicle.plate}`
            : `${driver.full_name} · sin vehículo asignado`
        }
      />

      {vehicleCategories.length === 0 ? (
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
