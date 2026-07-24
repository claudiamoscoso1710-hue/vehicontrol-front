"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { startTrip } from "@/lib/actions/trips";

type Props = {
  tripId: string;
  organizationId: string;
};

export function StartTripButton({ tripId, organizationId }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleStart() {
    setLoading(true);
    setError(null);

    const result = await startTrip(tripId, organizationId);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.refresh();
    setLoading(false);
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-medium">Iniciar viaje</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        El conductor podrá reportar gastos cuando el viaje esté en curso.
      </p>
      {error && <p className="mt-2 text-sm text-red-600">{error}</p>}
      <Button className="mt-3" onClick={handleStart} disabled={loading}>
        {loading ? "Iniciando..." : "Iniciar viaje"}
      </Button>
    </div>
  );
}
