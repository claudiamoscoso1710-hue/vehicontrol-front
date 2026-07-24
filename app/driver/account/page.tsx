import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import { DriverAccountView } from "@/components/shared/driver-account-view";
import { SettlementPeriodControls } from "@/components/shared/settlement-period-controls";
import { loadDriverAccountStatement } from "@/lib/reports/load-driver-account-statement";
import { DriverEmptyState, DriverPageContainer } from "@/components/driver/driver-ui";
import { Wallet } from "lucide-react";

type Props = {
  searchParams: Promise<{ period?: string }>;
};

export default async function DriverAccountPage({ searchParams }: Props) {
  const { period } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: driverProfile } = await supabase
    .from("drivers")
    .select("id, full_name, organization_id")
    .eq("user_id", user?.id ?? "")
    .maybeSingle();

  if (!driverProfile) {
    return (
      <DriverPageContainer>
        <DriverEmptyState
          icon={Wallet}
          title="Cuenta no disponible"
          description="No tienes un perfil de conductor activo vinculado."
        />
      </DriverPageContainer>
    );
  }

  const statement = await loadDriverAccountStatement(
    supabase,
    driverProfile.organization_id,
    driverProfile.id,
    period
  );

  return (
    <DriverPageContainer>
      <Suspense fallback={null}>
        <SettlementPeriodControls
          options={statement.periodOptions}
          selectedPeriodId={statement.periodId}
          periodRangeLabel={statement.periodRangeLabel}
          isCurrentPeriod={statement.isCurrentPeriod}
        />
      </Suspense>
      <DriverAccountView
        statement={statement}
        driverName={driverProfile.full_name}
        variant="driver"
      />
    </DriverPageContainer>
  );
}
