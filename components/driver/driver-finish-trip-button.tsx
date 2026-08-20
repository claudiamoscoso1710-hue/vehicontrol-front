"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Flag } from "lucide-react";
import { driverFinishTrip } from "@/lib/actions/driver-trips";
import { runDriverAction } from "@/lib/client/run-driver-action";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";

type Props = {
  tripId: string;
  organizationId: string;
  expenseCount: number;
  expenseTotal?: number;
};

export function DriverFinishTripButton({
  tripId,
  organizationId,
  expenseCount,
  expenseTotal = 0,
}: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function handleFinish() {
    setLoading(true);
    setError(null);

    try {
      const result = await runDriverAction(() =>
        driverFinishTrip(tripId, organizationId)
      );

      if (!result?.success) {
        setError(result?.error ?? "No se pudo terminar el viaje.");
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
          <p className="font-semibold">Viaje terminado</p>
          <p className="mt-1 text-emerald-700/90">
            El flete quedó registrado automáticamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-muted/50 px-4 py-3 text-sm">
        <p className="font-medium">
          {expenseCount > 0
            ? `${expenseCount} gasto(s) reportado(s)`
            : "Sin gastos reportados"}
        </p>
        {expenseCount > 0 && (
          <p className="mt-1 text-muted-foreground">
            Total gastos: {formatCurrency(expenseTotal)}
          </p>
        )}
        <p className="mt-2 text-xs text-muted-foreground">
          Al terminar el viaje se registra el flete y liberas el vehículo.
        </p>
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}

      {confirming ? (
        <div className="space-y-3 rounded-2xl border-2 border-amber-200 bg-amber-50 px-4 py-4">
          <p className="text-base font-semibold text-amber-950">
            ¿Estás seguro de que quieres terminar el viaje?
          </p>
          <p className="text-sm text-amber-900/80">
            Se registrará el flete y liberarás el vehículo. Esta acción no se
            puede deshacer.
          </p>
          <div className="flex flex-col gap-2 pt-1 sm:flex-row">
            <Button
              type="button"
              onClick={handleFinish}
              disabled={loading}
              className="h-12 flex-1 rounded-xl bg-amber-600 font-semibold text-white hover:bg-amber-700"
            >
              {loading ? "Terminando viaje..." : "Sí, terminar viaje"}
            </Button>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setConfirming(false);
                setError(null);
              }}
              disabled={loading}
              className="h-12 flex-1 rounded-xl border-amber-300 bg-white text-amber-950 hover:bg-amber-100"
            >
              Cancelar
            </Button>
          </div>
        </div>
      ) : (
        <Button
          type="button"
          onClick={() => setConfirming(true)}
          disabled={loading}
          className="h-14 w-full rounded-2xl border-2 border-amber-300 bg-amber-50 text-base font-bold text-amber-950 shadow-sm hover:bg-amber-100 active:scale-[0.98]"
        >
          <Flag className="mr-2 h-5 w-5" />
          Terminar viaje
        </Button>
      )}
    </div>
  );
}
