import { createClient } from "@/lib/supabase/server";
import { DriverBalanceCard } from "@/components/driver/driver-balance-card";
import { loadDriverAccountStatement } from "@/lib/reports/load-driver-account-statement";

type Props = {
  organizationId: string;
  driverId: string;
};

export async function DriverBalanceSection({
  organizationId,
  driverId,
}: Props) {
  const supabase = await createClient();
  const accountStatement = await loadDriverAccountStatement(
    supabase,
    organizationId,
    driverId
  );

  return (
    <DriverBalanceCard
      netBalance={accountStatement.netBalance}
      hasPendingItems={accountStatement.hasPendingItems}
    />
  );
}

export function DriverBalanceSectionFallback() {
  return (
    <div className="h-24 animate-pulse rounded-2xl border border-brand/10 bg-muted/40" />
  );
}
