"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  deactivateVehicleBySuperAdmin,
  updateVehicleBySuperAdmin,
} from "@/lib/actions/vehicles";

type Vehicle = {
  id: string;
  plate: string;
  brand: string | null;
  vehicle_type: string | null;
  commercial_status: string;
  operational_status: string;
  organizations: { name: string } | { name: string }[] | null;
};

type Props = {
  vehicles: Vehicle[];
};

export function AdminVehicleList({ vehicles }: Props) {
  const router = useRouter();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleUpdate(e: React.FormEvent<HTMLFormElement>, vehicleId: string) {
    e.preventDefault();
    setLoadingId(vehicleId);
    setError(null);

    const result = await updateVehicleBySuperAdmin(
      vehicleId,
      new FormData(e.currentTarget)
    );

    if (!result.success) {
      setError(result.error);
    } else {
      setEditingId(null);
      router.refresh();
    }
    setLoadingId(null);
  }

  async function handleDeactivate(vehicleId: string) {
    if (!confirm("¿Dar de baja este vehículo? No se eliminará el historial.")) {
      return;
    }

    setLoadingId(vehicleId);
    setError(null);

    const result = await deactivateVehicleBySuperAdmin(vehicleId);

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoadingId(null);
  }

  if (vehicles.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">No hay vehículos registrados.</p>
    );
  }

  return (
    <div className="space-y-3">
      {error && <p className="text-sm text-red-600">{error}</p>}
      {vehicles.map((vehicle) => {
        const org = Array.isArray(vehicle.organizations)
          ? vehicle.organizations[0]
          : vehicle.organizations;
        const isEditing = editingId === vehicle.id;
        const isLoading = loadingId === vehicle.id;

        return (
          <div key={vehicle.id} className="rounded-lg border p-4 text-sm">
            {isEditing ? (
              <form
                onSubmit={(e) => handleUpdate(e, vehicle.id)}
                className="space-y-3"
              >
                <div className="grid gap-2 sm:grid-cols-3">
                  <input
                    name="plate"
                    defaultValue={vehicle.plate}
                    required
                    className="rounded-md border px-3 py-1.5 text-sm uppercase"
                  />
                  <input
                    name="brand"
                    defaultValue={vehicle.brand ?? ""}
                    placeholder="Marca"
                    className="rounded-md border px-3 py-1.5 text-sm"
                  />
                  <input
                    name="vehicleType"
                    defaultValue={vehicle.vehicle_type ?? ""}
                    placeholder="Tipo"
                    className="rounded-md border px-3 py-1.5 text-sm"
                  />
                </div>
                <div className="flex gap-2">
                  <Button type="submit" size="sm" disabled={isLoading}>
                    {isLoading ? "Guardando..." : "Guardar"}
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={() => setEditingId(null)}
                  >
                    Cancelar
                  </Button>
                </div>
              </form>
            ) : (
              <>
                <p className="font-medium">
                  {vehicle.plate} · {org?.name ?? "Organización"}
                </p>
                <p className="text-muted-foreground">
                  {vehicle.brand ?? "Sin marca"} · {vehicle.vehicle_type ?? "Sin tipo"}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Comercial: {vehicle.commercial_status} · Operativo:{" "}
                  {vehicle.operational_status}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isLoading}
                    onClick={() => setEditingId(vehicle.id)}
                  >
                    Editar
                  </Button>
                  {vehicle.commercial_status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      disabled={isLoading}
                      onClick={() => handleDeactivate(vehicle.id)}
                      className="text-red-700"
                    >
                      {isLoading ? "..." : "Dar de baja"}
                    </Button>
                  )}
                </div>
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
