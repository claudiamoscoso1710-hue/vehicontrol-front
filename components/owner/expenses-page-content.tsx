import { getOwnerContext } from "@/lib/auth/cached-auth";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
import { filterCategoriesByScope } from "@/lib/expenses/expense-scope";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import { OwnerExpensesFilteredView } from "@/components/owner/owner-expenses-filtered-view";
import {
  getCurrentExpensePeriodGroup,
  loadOrganizationExpensesByPeriod,
} from "@/lib/reports/load-expenses-by-period";
import { formatCurrency } from "@/lib/format";

type Props = {
  organizationId: string;
};

export async function ExpensesPageContent({ organizationId }: Props) {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const caps = getOrgCapabilities(ctx.org.role);

  const [{ data: categories }, { data: vehicleRows }, groups] = await Promise.all([
    caps?.canManageExpenses
      ? ctx.supabase
          .from("expense_categories")
          .select("id, name, scope")
          .eq("organization_id", organizationId)
          .order("name")
      : Promise.resolve({ data: [] as { id: string; name: string; scope: string }[] }),
    caps?.canManageExpenses
      ? ctx.supabase
          .from("vehicles")
          .select("id, plate")
          .eq("organization_id", organizationId)
          .order("plate")
      : Promise.resolve({ data: [] as { id: string; plate: string }[] }),
    loadOrganizationExpensesByPeriod(ctx.supabase, organizationId),
  ]);
  const currentGroup = getCurrentExpensePeriodGroup(groups);

  const reportedTotal = currentGroup?.total ?? 0;
  const vehicleExpenseTotal =
    currentGroup?.expenses
      .filter((expense) => !expense.trip_id)
      .reduce((sum, expense) => sum + expense.amount, 0) ?? 0;
  const tripExpenseTotal = reportedTotal - vehicleExpenseTotal;

  const tripCategories = filterCategoriesByScope(categories ?? [], "trip").map(
    (c) => ({ id: c.id, name: c.name, scope: c.scope })
  );
  const vehicleCategories = filterCategoriesByScope(categories ?? [], "vehicle").map(
    (c) => ({ id: c.id, name: c.name, scope: c.scope })
  );

  const vehicles = (vehicleRows ?? []).map((row) => ({
    id: row.id,
    plate: row.plate,
  }));

  return (
    <>
      <p className="text-sm text-muted-foreground">
        {currentGroup?.expenses.length ?? 0} en el período vigente · Total{" "}
        {formatCurrency(reportedTotal)}
      </p>
      <p className="text-sm text-muted-foreground">
        Gastos del período vigente asumidos por la empresa: viaje{" "}
        {formatCurrency(tripExpenseTotal)} · vehículo{" "}
        {formatCurrency(vehicleExpenseTotal)}. Al liquidar, pasan al historial.
      </p>

      {caps?.canManageExpenses ? (
        <OwnerExpensesFilteredView
          groups={groups}
          organizationId={organizationId}
          tripCategories={tripCategories}
          vehicleCategories={vehicleCategories}
          vehicles={vehicles}
        />
      ) : (
        <ExpensePeriodGroups
          groups={groups}
          variant="owner"
          canManageExpenses={false}
          organizationId={organizationId}
          tripCategories={tripCategories}
          vehicleCategories={vehicleCategories}
        />
      )}
    </>
  );
}
