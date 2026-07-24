"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateOrganizationStatus } from "@/lib/actions/organizations";

type Props = {
  organizationId: string;
  currentStatus: string;
};

export function OrganizationStatusActions({
  organizationId,
  currentStatus,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleStatus(status: "active" | "suspended" | "cancelled") {
    setLoading(status);
    setError(null);

    const result = await updateOrganizationStatus(organizationId, status);

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(null);
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      {error && <p className="w-full text-xs text-red-600">{error}</p>}
      {currentStatus !== "active" && (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => handleStatus("active")}
          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          {loading === "active" ? "..." : "Activar"}
        </button>
      )}
      {currentStatus !== "suspended" && (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => handleStatus("suspended")}
          className="rounded-md border px-2 py-1 text-xs hover:bg-muted disabled:opacity-50"
        >
          {loading === "suspended" ? "..." : "Suspender"}
        </button>
      )}
      {currentStatus !== "cancelled" && (
        <button
          type="button"
          disabled={!!loading}
          onClick={() => handleStatus("cancelled")}
          className="rounded-md border px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
        >
          {loading === "cancelled" ? "..." : "Cancelar"}
        </button>
      )}
    </div>
  );
}
