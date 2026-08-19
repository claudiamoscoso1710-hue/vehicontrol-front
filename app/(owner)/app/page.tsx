import { Suspense } from "react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { resolveDashboardMonthContext } from "@/lib/reports/dashboard-month";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardMonthControls } from "@/components/shared/dashboard-month-controls";
import {
  OwnerDashboardSummarySection,
  OwnerDashboardTripsSection,
  OwnerDashboardVehiclesSection,
} from "@/components/owner/owner-dashboard-sections";
import {
  DashboardSectionSkeleton,
  KpiRowSkeleton,
} from "@/components/shared/page-loading-skeleton";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
};

type Props = {
  searchParams: Promise<{ month?: string }>;
};

export default async function OwnerDashboardPage({ searchParams }: Props) {
  const { month } = await searchParams;
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { org } = ctx;
  const monthContext = resolveDashboardMonthContext(month);

  return (
    <div className="space-y-8">
      <PageHeader
        title={org.organizationName}
        subtitle={`Finanzas por vehículo · ${ROLE_LABELS[org.role] ?? org.role}`}
      />

      <DashboardMonthControls
        options={monthContext.options}
        selectedMonthId={monthContext.monthId}
        rangeLabel={monthContext.rangeLabel}
        isCurrentMonth={monthContext.isCurrentMonth}
      />

      <Suspense
        fallback={
          <>
            <div className="h-40 animate-pulse rounded-xl bg-muted" />
            <KpiRowSkeleton />
          </>
        }
      >
        <OwnerDashboardSummarySection month={month} />
      </Suspense>

      <Suspense fallback={<DashboardSectionSkeleton rows={2} />}>
        <OwnerDashboardVehiclesSection month={month} />
      </Suspense>

      <Suspense fallback={<div className="h-72 animate-pulse rounded-xl bg-muted" />}>
        <OwnerDashboardTripsSection month={month} />
      </Suspense>
    </div>
  );
}
