"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { createTrip } from "@/lib/actions/trips";

type Option = { id: string; label: string };

type Props = {
  organizationId: string;
  vehicles: Option[];
  drivers: Option[];
  clients: Option[];
};

export function CreateTripForm({
  organizationId,
  vehicles,
  drivers,
  clients,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    const result = await createTrip(organizationId, formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(result.tripId ? `/app/trips/${result.tripId}` : "/app/trips");
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Crear viaje</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Vehículo *</label>
          <select name="vehicleId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Conductor *</label>
          <select name="driverId" required className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Seleccionar...</option>
            {drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Cliente</label>
          <select name="clientId" className="w-full rounded-md border px-3 py-2 text-sm">
            <option value="">Sin cliente</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Valor flete *</label>
          <CurrencyInput
            name="freightValue"
            required
            placeholder="8.500.000"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Origen *</label>
          <input name="origin" required className="w-full rounded-md border px-3 py-2 text-sm" />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Destino *</label>
          <input
            name="destination"
            required
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <Button type="submit" disabled={loading}>
          {loading ? "Creando..." : "Crear viaje"}
        </Button>
        <Link href="/app/trips">
          <Button type="button" variant="outline">
            Cancelar
          </Button>
        </Link>
      </div>
    </form>
  );
}
