"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { reviewVehicleCommercialStatus } from "@/lib/actions/vehicles";
import { formatCurrency } from "@/lib/format";

type Vehicle = {
  id: string;
  plate: string;
  brand: string | null;
  vehicle_type: string | null;
  commercial_status: string;
  organizations: { name: string } | { name: string }[] | null;
};

type Props = {
  vehicles: Vehicle[];
  pricePerVehicle: number;
};

export function VehicleApprovalList({ vehicles, pricePerVehicle }: Props) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleReview(vehicleId: string, decision: "active" | "cancelled") {
    setLoadingId(vehicleId);
    setError(null);

    const result = await reviewVehicleCommercialStatus(vehicleId, decision);

    if (!result.success) {
      setError(result.error);
      setLoadingId(null);
      return;
    }

    router.refresh();
    setLoadingId(null);
  }

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay vehículos pendientes de aprobación.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {vehicles.map((vehicle) => {
        const org = Array.isArray(vehicle.organizations)
          ? vehicle.organizations[0]
          : vehicle.organizations;

        return (
          <div key={vehicle.id} className="rounded-lg border p-4 text-sm">
            <p className="font-medium">
              {vehicle.plate} · {org?.name ?? "Organización"}
            </p>
            <p className="text-muted-foreground">
              {vehicle.brand ?? "Sin marca"} · {vehicle.vehicle_type ?? "Sin tipo"}
            </p>
            <p className="mt-1 text-muted-foreground">
              Impacto mensual estimado: +{formatCurrency(pricePerVehicle)}
            </p>
            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                disabled={loadingId === vehicle.id}
                onClick={() => handleReview(vehicle.id, "active")}
              >
                Aprobar
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={loadingId === vehicle.id}
                onClick={() => handleReview(vehicle.id, "cancelled")}
              >
                Rechazar
              </Button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
