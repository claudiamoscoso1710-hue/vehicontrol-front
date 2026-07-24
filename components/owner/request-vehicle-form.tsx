"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { requestVehicle } from "@/lib/actions/vehicles";

type Props = {
  organizationId: string;
};

export function RequestVehicleForm({ organizationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const formData = new FormData(e.currentTarget);
    const result = await requestVehicle(organizationId, formData);

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    e.currentTarget.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Solicitar nuevo vehículo</h2>
      <p className="text-sm text-muted-foreground">
        Quedará en estado pendiente hasta aprobación del Super Admin.
      </p>

      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="plate"
          placeholder="Placa *"
          required
          className="rounded-md border px-3 py-2 text-sm uppercase"
        />
        <input
          name="brand"
          placeholder="Marca"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="vehicleType"
          placeholder="Tipo (ej. FVR)"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-700">
          Solicitud enviada. Espera aprobación del Super Admin.
        </p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Enviando..." : "Solicitar vehículo"}
      </Button>
    </form>
  );
}
