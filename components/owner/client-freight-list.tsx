"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  CircleDollarSign,
  Clock,
  Loader2,
  Truck,
} from "lucide-react";
import { setTripFreightPaid } from "@/lib/actions/clients";
import { formatCurrency } from "@/lib/format";
import { StatusBadge } from "@/components/ui/status-badge";
import { Button } from "@/components/ui/button";

export type ClientFreightItem = {
  id: string;
  origin: string;
  destination: string;
  status: string;
  freightValue: number;
  freightPaid: boolean;
  freightPaidAt: string | null;
  startedAt: string | null;
  closedAt: string | null;
  createdAt: string;
  vehiclePlate: string | null;
  vehicleBrand: string | null;
  driverName: string | null;
};

type Props = {
  organizationId: string;
  freights: ClientFreightItem[];
  canManagePayment: boolean;
};

function formatTripDate(freight: ClientFreightItem) {
  const raw = freight.closedAt ?? freight.startedAt ?? freight.createdAt;
  return new Date(raw).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function ClientFreightList({
  organizationId,
  freights,
  canManagePayment,
}: Props) {
  if (freights.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Este cliente aún no tiene fletes registrados en viajes.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {freights.map((freight) => (
        <ClientFreightRow
          key={freight.id}
          organizationId={organizationId}
          freight={freight}
          canManagePayment={canManagePayment}
        />
      ))}
    </ul>
  );
}

function ClientFreightRow({
  organizationId,
  freight,
  canManagePayment,
}: {
  organizationId: string;
  freight: ClientFreightItem;
  canManagePayment: boolean;
}) {
  const router = useRouter();
  const [paid, setPaid] = useState(freight.freightPaid);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canTogglePayment =
    canManagePayment &&
    freight.status === "closed" &&
    freight.freightValue > 0;

  async function handleToggle() {
    if (!canTogglePayment || loading) return;

    setLoading(true);
    setError(null);

    const nextPaid = !paid;
    const result = await setTripFreightPaid(
      organizationId,
      freight.id,
      nextPaid
    );

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setPaid(nextPaid);
    setLoading(false);
    router.refresh();
  }

  return (
    <li className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0 flex-1 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="font-semibold">
              {freight.origin} → {freight.destination}
            </p>
            <StatusBadge status={freight.status} />
            {freight.status === "closed" && freight.freightValue > 0 ? (
              paid ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  Flete pagado
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
                  <Clock className="h-3.5 w-3.5" />
                  Pendiente de pago
                </span>
              )
            ) : null}
          </div>

          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1.5">
              <Truck className="h-4 w-4 shrink-0" />
              {freight.vehiclePlate ?? "Sin vehículo"}
              {freight.vehicleBrand ? ` · ${freight.vehicleBrand}` : ""}
            </span>
            <span>{freight.driverName ?? "Sin conductor"}</span>
            <span>{formatTripDate(freight)}</span>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <p className="inline-flex items-center gap-1.5 text-lg font-bold">
              <CircleDollarSign className="h-5 w-5 text-brand" />
              {formatCurrency(freight.freightValue)}
            </p>
            <Link
              href={`/app/trips/${freight.id}`}
              className="inline-flex items-center gap-1 text-sm font-medium text-brand hover:underline"
            >
              Ver viaje
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {paid && freight.freightPaidAt ? (
            <p className="text-xs text-muted-foreground">
              Marcado como pagado el{" "}
              {new Date(freight.freightPaidAt).toLocaleDateString("es-CO")}
            </p>
          ) : null}

          {error ? <p className="text-sm text-red-600">{error}</p> : null}
        </div>

        {canTogglePayment ? (
          <div className="shrink-0 sm:pt-1">
            <Button
              type="button"
              variant={paid ? "outline" : "default"}
              size="sm"
              disabled={loading}
              onClick={handleToggle}
              className={
                paid
                  ? "min-w-[9.5rem]"
                  : "min-w-[9.5rem] bg-brand text-brand-foreground hover:bg-brand/90"
              }
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : paid ? (
                "Marcar pendiente"
              ) : (
                "Marcar pagado"
              )}
            </Button>
          </div>
        ) : null}
      </div>
    </li>
  );
}
