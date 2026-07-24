"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { assignVehicleDriver } from "@/lib/actions/vehicles";

type DriverOption = {
  id: string;
  full_name: string;
};

type Props = {
  organizationId: string;
  vehicleId: string;
  assignedDriverId: string | null;
  drivers: DriverOption[];
  disabled?: boolean;
};

export function AssignDriverForm({
  organizationId,
  vehicleId,
  assignedDriverId,
  drivers,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [driverId, setDriverId] = useState(assignedDriverId ?? "");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await assignVehicleDriver(
      vehicleId,
      organizationId,
      driverId || null
    );

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Conductor asignado</p>
        <p className="text-xs text-muted-foreground">
          El conductor usa este vehículo para viajes y gastos del carro.
        </p>
      </div>

      <select
        value={driverId}
        onChange={(e) => setDriverId(e.target.value)}
        disabled={disabled || loading}
        className="w-full rounded-md border px-3 py-2 text-sm"
      >
        <option value="">Sin conductor asignado</option>
        {drivers.map((driver) => (
          <option key={driver.id} value={driver.id}>
            {driver.full_name}
          </option>
        ))}
      </select>

      {drivers.length === 0 ? (
        <p className="text-xs text-muted-foreground">
          Crea conductores activos en la sección Conductores.
        </p>
      ) : null}

      {error ? <p className="text-sm text-red-600">{error}</p> : null}

      <Button type="submit" size="sm" disabled={disabled || loading || drivers.length === 0}>
        {loading ? "Guardando..." : "Guardar asignación"}
      </Button>
    </form>
  );
}
