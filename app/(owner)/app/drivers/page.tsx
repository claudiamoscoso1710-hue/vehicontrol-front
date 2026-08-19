import { Suspense } from "react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { PageHeader } from "@/components/ui/page-header";
import { DriversDashboardSection } from "@/components/owner/drivers-dashboard-section";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

async function DriversPageHeader() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  return (
    <PageHeader
      title="Conductores"
      subtitle={`${ctx.org.organizationName} · Dashboard de cuentas y período actual`}
    />
  );
}

export default function DriversPage() {
  return (
    <div className="space-y-8">
      <Suspense
        fallback={
          <div className="h-16 animate-pulse rounded-lg bg-muted" aria-hidden />
        }
      >
        <DriversPageHeader />
      </Suspense>

      <DriversDashboardSection />
    </div>
  );
}
