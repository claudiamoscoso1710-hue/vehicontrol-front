"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Play, Truck } from "lucide-react";
import { driverRegisterTrip } from "@/lib/actions/driver-trips";
import { runDriverAction } from "@/lib/client/run-driver-action";
import { DRIVER_HELD_FREIGHT_REGISTER_HINT } from "@/lib/reports/driver-held-freight";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { driverFieldClassName } from "@/components/driver/driver-ui";

type Option = { id: string; label: string };

type AssignedVehicle = {
  plate: string;
  brand: string | null;
};

type Props = {
  organizationId: string;
  assignedVehicle: AssignedVehicle | null;
  clients: Option[];
};

export function DriverRegisterTripForm({
  organizationId,
  assignedVehicle,
  clients,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [clientId, setClientId] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setDone(false);

    try {
      const formData = new FormData(e.currentTarget);
      const result = await runDriverAction(() =>
        driverRegisterTrip(organizationId, formData)
      );

      if (!result.success) {
        setError(result.error ?? "No se pudo registrar el viaje.");
        return;
      }

      setDone(true);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="flex items-start gap-3 rounded-2xl bg-emerald-50 px-4 py-4 text-sm text-emerald-800">
        <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="font-semibold">Viaje iniciado</p>
          <p className="mt-1 text-emerald-700/90">
            Ya puedes reportar gastos del viaje.
          </p>
        </div>
      </div>
    );
  }

  if (!assignedVehicle) {
    return (
      <div className="rounded-2xl bg-amber-50 px-4 py-4 text-sm text-amber-900">
        No tienes un vehículo asignado. Pide a tu empresa que te asigne uno en la
        flota.
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="flex items-center gap-3 rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-brand/15 text-brand">
          <Truck className="h-5 w-5" />
        </div>
        <div>
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Tu vehículo
          </p>
          <p className="font-semibold">{assignedVehicle.plate}</p>
          {assignedVehicle.brand ? (
            <p className="text-xs text-muted-foreground">{assignedVehicle.brand}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor="origin" className="text-sm font-semibold">
            Origen
          </label>
          <input
            id="origin"
            name="origin"
            required
            placeholder="Bogotá"
            autoComplete="off"
            className={driverFieldClassName()}
          />
        </div>
        <div className="space-y-1.5">
          <label htmlFor="destination" className="text-sm font-semibold">
            Destino
          </label>
          <input
            id="destination"
            name="destination"
            required
            placeholder="Medellín"
            autoComplete="off"
            className={driverFieldClassName()}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <label htmlFor="freightValue" className="text-sm font-semibold">
          Valor del flete
        </label>
        <CurrencyInput
          id="freightValue"
          name="freightValue"
          required
          placeholder="8.500.000"
          className={driverFieldClassName("font-bold")}
        />
      </div>

      {clients.length > 0 && (
        <div className="space-y-1.5">
          <label htmlFor="clientId" className="text-sm font-semibold">
            Cliente{" "}
            <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <select
            id="clientId"
            name="clientId"
            className={driverFieldClassName()}
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
          >
            <option value="">Sin cliente</option>
            {clients.map((client) => (
              <option key={client.id} value={client.id}>
                {client.label}
              </option>
            ))}
          </select>
        </div>
      )}

      {(clients.length === 0 || (clients.length > 0 && !clientId)) ? (
        <div className="rounded-2xl border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-950">
          <p className="font-semibold">Flete en tu poder</p>
          <p className="mt-1 text-orange-900/90">{DRIVER_HELD_FREIGHT_REGISTER_HINT}</p>
        </div>
      ) : null}

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand/90 active:scale-[0.98]"
      >
        <Play className="mr-2 h-5 w-5" />
        {loading ? "Registrando..." : "Iniciar viaje"}
      </Button>
    </form>
  );
}
