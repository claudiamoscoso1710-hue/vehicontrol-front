import { Suspense } from "react";
import { ClientsPageContent } from "@/components/owner/clients-page-content";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default function ClientsPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton rows={4} />}>
      <ClientsPageContent />
    </Suspense>
  );
}
