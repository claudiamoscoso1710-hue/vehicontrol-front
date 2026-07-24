"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { setDriverStatus } from "@/lib/actions/drivers";
import { updateDriverCommission } from "@/lib/actions/driver-compensation";
import { LinkDriverForm } from "@/components/owner/link-driver-form";

type Driver = {
  id: string;
  full_name: string;
  phone: string | null;
  status: string;
  user_id: string | null;
  commission_percent: number | null;
};

type Props = {
  organizationId: string;
  drivers: Driver[];
  canManage: boolean;
};

export function DriverList({ organizationId, drivers, canManage }: Props) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggleStatus(driver: Driver) {
    setBusyId(driver.id);
    setError(null);

    const next = driver.status === "active" ? "inactive" : "active";
    const result = await setDriverStatus(organizationId, driver.id, next);

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setBusyId(null);
  }

  async function saveCommission(driverId: string, form: HTMLFormElement) {
    setBusyId(driverId);
    setError(null);

    const result = await updateDriverCommission(
      organizationId,
      driverId,
      new FormData(form)
    );

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setBusyId(null);
  }

  if (drivers.length === 0) {
    return <p className="text-sm text-muted-foreground">Sin conductores.</p>;
  }

  return (
    <div className="space-y-2">
      {error && <p className="text-sm text-red-600">{error}</p>}
      <ul className="space-y-2">
        {drivers.map((driver) => (
          <li
            key={driver.id}
            className="rounded-lg border p-4 text-sm space-y-3"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-medium">{driver.full_name}</p>
                <p className="text-muted-foreground">
                  {driver.phone ?? "Sin teléfono"} ·{" "}
                  {driver.user_id ? "Con acceso a la app" : "Sin usuario vinculado"}
                </p>
                <p className="mt-1">
                  Estado:{" "}
                  <strong
                    className={
                      driver.status === "active"
                        ? "text-green-700"
                        : "text-muted-foreground"
                    }
                  >
                    {driver.status === "active" ? "Activo" : "Inactivo"}
                  </strong>
                </p>
                {canManage && !driver.user_id && (
                  <LinkDriverForm
                    organizationId={organizationId}
                    driverId={driver.id}
                  />
                )}
              </div>
              <div className="flex flex-col items-end gap-2">
                {canManage && (
                  <button
                    type="button"
                    onClick={() => toggleStatus(driver)}
                    disabled={busyId === driver.id}
                    className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                  >
                    {busyId === driver.id
                      ? "..."
                      : driver.status === "active"
                        ? "Desactivar"
                        : "Activar"}
                  </button>
                )}
                <Link
                  href={`/app/drivers/${driver.id}/account`}
                  className="text-xs font-medium text-brand hover:underline"
                >
                  Ver estado de cuenta
                </Link>
              </div>
            </div>

            {canManage && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  saveCommission(driver.id, e.currentTarget);
                }}
                className="flex flex-wrap items-end gap-2 border-t pt-3"
              >
                <label className="text-xs">
                  <span className="font-medium">Comisión personal (%)</span>
                  <input
                    name="commissionPercent"
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    placeholder="Usar % de la empresa"
                    defaultValue={driver.commission_percent ?? ""}
                    className="mt-1 block w-36 rounded-md border px-2 py-1.5"
                  />
                </label>
                <button
                  type="submit"
                  disabled={busyId === driver.id}
                  className="rounded-md border px-3 py-1.5 text-xs hover:bg-muted disabled:opacity-50"
                >
                  Guardar %
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
