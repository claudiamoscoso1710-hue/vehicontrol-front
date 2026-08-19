import { Suspense } from "react";
import { getDriverContext } from "@/lib/auth/cached-auth";
import { loadDriverAccountStatement } from "@/lib/reports/load-driver-account-statement";
import { DriverAccountView } from "@/components/shared/driver-account-view";
import { SettlementPeriodControls } from "@/components/shared/settlement-period-controls";
import { DriverEmptyState, DriverPageContainer } from "@/components/driver/driver-ui";
import { Wallet } from "lucide-react";

type ContentProps = {
  period?: string;
};

async function DriverAccountContent({ period }: ContentProps) {
  const ctx = await getDriverContext();
  if (!ctx) {
    return (
      <DriverEmptyState
        icon={Wallet}
        title="Cuenta no disponible"
        description="No tienes un perfil de conductor activo vinculado."
      />
    );
  }

  const statement = await loadDriverAccountStatement(
    ctx.supabase,
    ctx.driver.organization_id,
    ctx.driver.id,
    period
  );

  return (
    <>
      <SettlementPeriodControls
        options={statement.periodOptions}
        selectedPeriodId={statement.periodId}
        periodRangeLabel={statement.periodRangeLabel}
        isCurrentPeriod={statement.isCurrentPeriod}
      />
      <DriverAccountView
        statement={statement}
        driverName={ctx.driver.full_name}
        variant="driver"
      />
    </>
  );
}

function AccountSkeleton() {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-10 rounded-lg bg-muted" />
      <div className="h-48 rounded-2xl bg-muted" />
      <div className="h-64 rounded-2xl bg-muted" />
    </div>
  );
}

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DriverAccountPage({ searchParams }: Props) {
  const { period } = await searchParams;

  return (
    <DriverPageContainer>
      <Suspense fallback={<AccountSkeleton />}>
        <DriverAccountContent period={period} />
      </Suspense>
    </DriverPageContainer>
  );
}
