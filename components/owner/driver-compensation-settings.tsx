"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { saveDriverCompensationSettings } from "@/lib/actions/driver-compensation";
import type { DriverCompensationConfig } from "@/lib/settings/driver-compensation";

type Props = {
  organizationId: string;
  config: DriverCompensationConfig;
};

export function DriverCompensationSettings({
  organizationId,
  config,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await saveDriverCompensationSettings(
      organizationId,
      new FormData(e.currentTarget)
    );

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <div>
        <p className="text-sm font-medium">Sueldo del conductor</p>
        <p className="text-xs text-muted-foreground">
          El conductor siempre ve su sueldo como % del flete. Los gastos se
          reembolsan aparte en la liquidación.
        </p>
      </div>

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">Base de cálculo</legend>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="salaryBasis"
            value="before_expenses"
            defaultChecked={config.salary_basis === "before_expenses"}
            className="mt-1"
          />
          <span>
            <strong>Antes de gastos</strong> — % sobre el flete del viaje
          </span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input
            type="radio"
            name="salaryBasis"
            value="after_expenses"
            defaultChecked={config.salary_basis === "after_expenses"}
            className="mt-1"
          />
          <span>
            <strong>Después de gastos</strong> — % sobre flete − gastos aprobados
          </span>
        </label>
      </fieldset>

      <label className="block text-sm">
        <span className="font-medium">Comisión por defecto (%)</span>
        <input
          name="commissionPercent"
          type="number"
          min={0}
          max={100}
          step={0.5}
          defaultValue={config.commission_percent}
          required
          className="mt-1 w-full max-w-xs rounded-md border px-3 py-2"
        />
        <span className="mt-1 block text-xs text-muted-foreground">
          Puedes definir un % distinto por conductor en la lista de conductores.
        </span>
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Guardando..." : "Guardar configuración"}
      </Button>
    </form>
  );
}
