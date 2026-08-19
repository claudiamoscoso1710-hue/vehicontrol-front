import { Suspense } from "react";
import { SettingsPageContent } from "@/components/owner/settings-page-content";
import { DashboardSectionSkeleton } from "@/components/shared/page-loading-skeleton";

export default function SettingsPage() {
  return (
    <Suspense fallback={<DashboardSectionSkeleton rows={3} />}>
      <SettingsPageContent />
    </Suspense>
  );
}
