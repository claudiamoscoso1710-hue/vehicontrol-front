import { Suspense } from "react";
import { getOwnerContext } from "@/lib/auth/cached-auth";
import { VehiclesFleetSection } from "@/components/owner/vehicles-fleet-section";
import { PageHeader } from "@/components/ui/page-header";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default async function VehiclesPage() {
  const ctx = await getOwnerContext();
  if (!ctx) return null;

  const { org } = ctx;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Flota"
        subtitle={`${org.organizationName} · período actual de liquidación por vehículo`}
      />

      <Suspense fallback={<DashboardSectionSkeleton rows={4} />}>
        <VehiclesFleetSection organizationId={org.organizationId} />
      </Suspense>
    </div>
  );
}
