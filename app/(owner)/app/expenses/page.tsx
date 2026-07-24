import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
import { ExpensePeriodGroups } from "@/components/shared/expense-period-groups";
import {
  getCurrentExpensePeriodGroup,
  loadOrganizationExpensesByPeriod,
} from "@/lib/reports/load-expenses-by-period";
import { formatCurrency } from "@/lib/format";

export default async function ExpensesPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const caps = getOrgCapabilities(org.role);
  if (!caps?.canViewExpenses) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Sin acceso a esta sección.</p>
      </main>
    );
  }

  const groups = await loadOrganizationExpensesByPeriod(
    supabase,
    org.organizationId
  );
  const currentGroup = getCurrentExpensePeriodGroup(groups);

  const reportedTotal = currentGroup?.total ?? 0;
  const vehicleExpenseTotal =
    currentGroup?.expenses
      .filter((expense) => !expense.trip_id)
      .reduce((sum, expense) => sum + expense.amount, 0) ?? 0;
  const tripExpenseTotal = reportedTotal - vehicleExpenseTotal;

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Gastos reportados</h1>
        <p className="text-sm text-muted-foreground">
          {org.organizationName} · {currentGroup?.expenses.length ?? 0} en el período
          vigente · Total {formatCurrency(reportedTotal)}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Gastos del período vigente asumidos por la empresa: viaje{" "}
          {formatCurrency(tripExpenseTotal)} · vehículo{" "}
          {formatCurrency(vehicleExpenseTotal)}. Al liquidar, pasan al historial.
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Los conductores reportan gastos desde la app. Aquí solo se consultan.
        </p>
      </header>

      <ExpensePeriodGroups groups={groups} variant="owner" />

      {groups.every((group) => group.expenses.length === 0) && (
        <section className="text-sm text-muted-foreground">
          <p>
            Los gastos también aparecen en{" "}
            <Link href="/app/trips" className="text-blue-600 hover:underline">
              Viajes
            </Link>
            .
          </p>
        </section>
      )}
    </main>
  );
}
