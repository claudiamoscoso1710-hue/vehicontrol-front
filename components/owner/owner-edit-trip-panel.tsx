"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Trash2, X } from "lucide-react";
import { deleteTrip, updateTrip } from "@/lib/actions/trips";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { StatusBadge } from "@/components/ui/status-badge";

type Option = { id: string; label: string };

type Props = {
  organizationId: string;
  tripId: string;
  origin: string;
  destination: string;
  freightValue: number;
  status: string;
  vehicleId: string;
  driverId: string;
  clientId: string | null;
  settlementId: string | null;
  vehicles: Option[];
  drivers: Option[];
  clients: Option[];
};

export function OwnerEditTripPanel(props: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const isSettled = Boolean(props.settlementId);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await updateTrip(
      props.organizationId,
      props.tripId,
      new FormData(e.currentTarget)
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setOpen(false);
    router.refresh();
    setLoading(false);
  }

  async function handleDelete() {
    if (
      !confirm(
        "¿Eliminar este viaje? Solo funciona si no tiene gastos asociados."
      )
    ) {
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await deleteTrip(props.tripId, props.organizationId);
    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.push("/app/trips");
  }

  if (isSettled) {
    return (
      <p className="text-xs text-muted-foreground">
        Viaje liquidado: no se puede editar ni eliminar.
      </p>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-brand/40 px-3 py-2 text-sm font-medium text-brand hover:bg-brand/5"
      >
        <Pencil className="h-4 w-4" />
        Editar viaje
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border bg-muted/20 p-4"
    >
      <div className="flex items-center justify-between">
        <p className="font-medium">Editar viaje</p>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <input type="hidden" name="tripId" value={props.tripId} />

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <label className="text-sm font-medium">Vehículo *</label>
          <select
            name="vehicleId"
            required
            defaultValue={props.vehicleId}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {props.vehicles.map((v) => (
              <option key={v.id} value={v.id}>
                {v.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Conductor *</label>
          <select
            name="driverId"
            required
            defaultValue={props.driverId}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {props.drivers.map((d) => (
              <option key={d.id} value={d.id}>
                {d.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Cliente</label>
          <select
            name="clientId"
            defaultValue={props.clientId ?? ""}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Sin cliente</option>
            {props.clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Estado</label>
          <select
            name="status"
            defaultValue={props.status}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="planned">Planeado</option>
            <option value="in_progress">En curso</option>
            <option value="closed">Cerrado</option>
          </select>
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Origen *</label>
          <input
            name="origin"
            required
            defaultValue={props.origin}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1">
          <label className="text-sm font-medium">Destino *</label>
          <input
            name="destination"
            required
            defaultValue={props.destination}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
        <div className="space-y-1 sm:col-span-2">
          <label className="text-sm font-medium">Flete *</label>
          <CurrencyInput
            name="freightValue"
            required
            defaultValue={props.freightValue}
            className="w-full rounded-md border px-3 py-2 text-sm font-semibold"
          />
        </div>
      </div>

      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        Estado actual: <StatusBadge status={props.status} />
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={loading || deleting}>
          {loading ? "Guardando..." : "Guardar viaje"}
        </Button>
        <Button
          type="button"
          variant="outline"
          disabled={loading || deleting}
          onClick={handleDelete}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="mr-1 h-4 w-4" />
          {deleting ? "Eliminando..." : "Eliminar viaje"}
        </Button>
      </div>
    </form>
  );
}
