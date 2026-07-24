import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { getActiveOrganization } from "@/lib/auth/get-active-organization";
import { DriverAccountView } from "@/components/shared/driver-account-view";
import { DriverSettlementPanel } from "@/components/owner/driver-settlement-panel";
import { SettlementPeriodControls } from "@/components/shared/settlement-period-controls";
import { loadDriverAccountStatement } from "@/lib/reports/load-driver-account-statement";
import Link from "next/link";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ period?: string }>;
};

export default async function DriverAccountPage({ params, searchParams }: Props) {
  const { id } = await params;
  const { period } = await searchParams;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  const org = await getActiveOrganization(supabase, user.id);
  if (!org) return null;

  const { data: driver } = await supabase
    .from("drivers")
    .select("id, full_name")
    .eq("id", id)
    .eq("organization_id", org.organizationId)
    .single();

  if (!driver) {
    return (
      <main className="mx-auto max-w-4xl p-8">
        <p className="text-sm text-muted-foreground">Conductor no encontrado.</p>
        <Link href="/app/drivers" className="mt-2 inline-block text-sm text-brand">
          ← Volver a conductores
        </Link>
      </main>
    );
  }

  const statement = await loadDriverAccountStatement(
    supabase,
    org.organizationId,
    driver.id,
    period
  );

  return (
    <main className="mx-auto max-w-4xl space-y-4 p-8">
      <Link href="/app/drivers" className="text-sm text-brand hover:underline">
        ← Conductores
      </Link>
      <Suspense fallback={null}>
        <SettlementPeriodControls
          options={statement.periodOptions}
          selectedPeriodId={statement.periodId}
          periodRangeLabel={statement.periodRangeLabel}
          isCurrentPeriod={statement.isCurrentPeriod}
        />
      </Suspense>
      {statement.isCurrentPeriod ? (
        <DriverSettlementPanel
          organizationId={org.organizationId}
          driverId={driver.id}
          statement={statement}
        />
      ) : (
        <section className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
          Estás viendo un período liquidado. Para liquidar movimientos nuevos, vuelve
          al período actual.
        </section>
      )}
      <DriverAccountView
        statement={statement}
        driverName={driver.full_name}
        variant="owner"
      />
    </main>
  );
}
