"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, X } from "lucide-react";
import { driverUpdateTrip } from "@/lib/actions/driver-trips";
import { runDriverAction } from "@/lib/client/run-driver-action";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { driverFieldClassName } from "@/components/driver/driver-ui";

type Props = {
  organizationId: string;
  tripId: string;
  origin: string;
  destination: string;
  freightValue: number;
};

export function DriverEditTripForm({
  organizationId,
  tripId,
  origin,
  destination,
  freightValue,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await runDriverAction(() =>
        driverUpdateTrip(organizationId, tripId, new FormData(e.currentTarget))
      );

      if (!result.success) {
        setError(result.error ?? "No se pudo actualizar el viaje.");
        return;
      }

      setOpen(false);
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/30 bg-white/60 px-4 py-3 text-sm font-semibold text-brand transition-colors active:scale-[0.99] hover:bg-brand/5"
      >
        <Pencil className="h-4 w-4" />
        Editar viaje
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3 rounded-2xl border bg-white/80 p-4">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Editar viaje</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Cerrar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3">
        <div className="space-y-1.5">
          <label htmlFor={`origin-${tripId}`} className="text-sm font-semibold">
            Origen
          </label>
          <input
            id={`origin-${tripId}`}
            name="origin"
            required
            defaultValue={origin}
            className={driverFieldClassName()}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`destination-${tripId}`}
            className="text-sm font-semibold"
          >
            Destino
          </label>
          <input
            id={`destination-${tripId}`}
            name="destination"
            required
            defaultValue={destination}
            className={driverFieldClassName()}
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor={`freightValue-${tripId}`}
            className="text-sm font-semibold"
          >
            Flete
          </label>
          <CurrencyInput
            id={`freightValue-${tripId}`}
            name="freightValue"
            defaultValue={freightValue}
            required
            className={driverFieldClassName("font-bold")}
          />
        </div>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}

      <Button
        type="submit"
        disabled={loading}
        className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-foreground"
      >
        {loading ? "Guardando..." : "Guardar cambios"}
      </Button>
    </form>
  );
}
