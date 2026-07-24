"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { createDriverAdvance } from "@/lib/actions/driver-compensation";

type DriverOption = {
  id: string;
  full_name: string;
};

type Props = {
  organizationId: string;
  drivers: DriverOption[];
  fixedDriverId?: string;
  compact?: boolean;
  defaultDeliveredByName?: string;
  onSuccess?: () => void;
};

export function CreateAdvanceForm({
  organizationId,
  drivers,
  fixedDriverId,
  compact = false,
  defaultDeliveredByName = "",
  onSuccess,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [formKey, setFormKey] = useState(0);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setLoading(true);
    setError(null);

    const result = await createDriverAdvance(
      organizationId,
      new FormData(form)
    );

    if (!result.success) {
      setError(result.error);
    } else {
      form.reset();
      setFormKey((k) => k + 1);
      onSuccess?.();
      router.refresh();
    }
    setLoading(false);
  }

  if (drivers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Crea conductores activos para registrar anticipos.
      </p>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={
        compact
          ? "space-y-3"
          : "space-y-3 rounded-lg border p-4"
      }
    >
      {!compact ? (
        <div>
          <p className="text-sm font-medium">Registrar anticipo</p>
          <p className="text-xs text-muted-foreground">
            Dinero entregado al conductor antes del pago de sueldo.
          </p>
        </div>
      ) : (
        <p className="text-sm font-medium">Registrar anticipo rápido</p>
      )}

      {fixedDriverId ? (
        <input type="hidden" name="driverId" value={fixedDriverId} />
      ) : (
        <label className="block text-sm">
          <span className="font-medium">Conductor</span>
          <select
            name="driverId"
            required
            className="mt-1 w-full rounded-md border px-3 py-2"
            defaultValue=""
          >
            <option value="" disabled>
              Seleccionar...
            </option>
            {drivers.map((driver) => (
              <option key={driver.id} value={driver.id}>
                {driver.full_name}
              </option>
            ))}
          </select>
        </label>
      )}

      <label className="block text-sm">
        <span className="font-medium">Monto</span>
        <CurrencyInput
          key={`amount-${formKey}`}
          name="amount"
          required
          placeholder="500.000"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
      </label>

      <label className="block text-sm">
        <span className="font-medium">Entregado por</span>
        <input
          key={`deliveredBy-${formKey}`}
          type="text"
          name="deliveredByName"
          required
          defaultValue={defaultDeliveredByName}
          placeholder="Nombre de quien entregó el dinero"
          className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Persona que entregó el anticipo al conductor
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" size="sm" disabled={loading}>
          {loading ? "Registrando..." : "Registrar anticipo"}
        </Button>
        {compact && onSuccess ? (
          <Button type="button" variant="ghost" size="sm" onClick={onSuccess}>
            Cancelar
          </Button>
        ) : null}
      </div>
    </form>
  );
}
