import { Suspense } from "react";
import Link from "next/link";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { getOrgCapabilities } from "@/lib/permissions/capabilities";
import { ExpensesPageContent } from "@/components/owner/expenses-page-content";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default async function ExpensesPage() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const caps = getOrgCapabilities(ctx.org.role);
  if (!caps?.canViewExpenses) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Sin acceso a esta sección.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-4xl space-y-6 p-8">
      <header>
        <h1 className="text-2xl font-semibold">Gastos reportados</h1>
        <p className="text-sm text-muted-foreground">
          {ctx.org.organizationName} · Los conductores reportan desde la app
        </p>
      </header>

      <Suspense fallback={<DashboardSectionSkeleton rows={3} />}>
        <ExpensesPageContent organizationId={ctx.org.organizationId} />
      </Suspense>

      <section className="text-sm text-muted-foreground">
        <p>
          Los gastos también aparecen en{" "}
          <Link href="/app/trips" className="text-blue-600 hover:underline">
            Viajes
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
