import { Suspense } from "react";
import { TripsPageContent } from "@/components/owner/trips-page-content";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default function TripsPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton rows={5} />}>
      <TripsPageContent />
    </Suspense>
  );
}
