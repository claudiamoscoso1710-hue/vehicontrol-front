"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createVehicleBySuperAdmin } from "@/lib/actions/vehicles";

type OrgOption = {
  id: string;
  name: string;
};

type Props = {
  organizations: OrgOption[];
};

export function CreateVehicleForm({ organizations }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createVehicleBySuperAdmin(new FormData(e.currentTarget));

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    e.currentTarget.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Registrar vehículo</h2>
      <p className="text-xs text-muted-foreground">
        Solo Super Admin puede dar de alta vehículos en la plataforma.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <select
          name="organizationId"
          required
          className="rounded-md border px-3 py-2 text-sm"
          defaultValue=""
        >
          <option value="" disabled>
            Organización *
          </option>
          {organizations.map((org) => (
            <option key={org.id} value={org.id}>
              {org.name}
            </option>
          ))}
        </select>
        <input
          name="plate"
          placeholder="Placa *"
          required
          className="rounded-md border px-3 py-2 text-sm uppercase"
        />
        <input
          name="brand"
          placeholder="Marca (opcional)"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="vehicleType"
          placeholder="Tipo (opcional)"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading || organizations.length === 0}>
        {loading ? "Creando..." : "Crear vehículo"}
      </Button>
    </form>
  );
}
