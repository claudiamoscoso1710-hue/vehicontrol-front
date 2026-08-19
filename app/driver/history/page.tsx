import { Suspense } from "react";
import { getDriverContext } from "@/lib/auth/cached-auth";
import { DriverHistoryTabs } from "@/components/driver/history-tabs";
import { DriverHistoryContent } from "@/components/driver/driver-history-content";
import { DriverPageContainer } from "@/components/driver/driver-ui";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default async function DriverHistoryPage() {
  const ctx = await getDriverContext();

  return (
    <DriverPageContainer>
      <Suspense fallback={<DashboardSectionSkeleton rows={3} />}>
        {ctx ? (
          <DriverHistoryContent driver={ctx.driver} supabase={ctx.supabase} />
        ) : (
          <DriverHistoryTabs
            driverName="Conductor"
            trips={[]}
            expenseGroups={[]}
            totalExpenseCount={0}
          />
        )}
      </Suspense>
    </DriverPageContainer>
  );
}
