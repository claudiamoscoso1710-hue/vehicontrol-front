"use client";

import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";
import { DriverExpenseForm } from "@/components/driver/expense-form";
import { NetworkStatusBanner } from "@/components/driver/network-status-banner";
import { loadDriverHomeSnapshot } from "@/lib/offline/db";
import type { DriverHomeData } from "@/lib/reports/load-driver-home";
import { formatCurrency } from "@/lib/format";

export default function OfflinePage() {
  const [home, setHome] = useState<DriverHomeData | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    void loadDriverHomeSnapshot().then((snapshot) => {
      setHome((snapshot?.data as DriverHomeData | undefined) ?? null);
      setLoaded(true);
    });
  }, []);

  if (!loaded) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-sm text-muted-foreground">
        Cargando datos locales…
      </div>
    );
  }

  if (!home?.driver) {
    return (
      <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
          <WifiOff className="h-8 w-8" />
        </div>
        <h1 className="mt-6 text-xl font-bold">Sin conexión</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Abre el panel del conductor al menos una vez con internet para poder
          reportar gastos sin señal.
        </p>
        <a
          href="/driver"
          className="mt-8 rounded-xl bg-brand px-5 py-3 text-sm font-semibold text-brand-foreground"
        >
          Reintentar
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background">
      <NetworkStatusBanner />
      <div className="mx-auto max-w-md space-y-5 px-4 py-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Modo sin conexión
          </p>
          <h1 className="mt-1 text-xl font-bold">
            Hola, {home.driver.fullName.split(" ")[0]}
          </h1>
          <p className="text-sm text-muted-foreground">
            {home.activeTrip
              ? `${home.activeTrip.origin} → ${home.activeTrip.destination}`
              : "Sin viaje activo. Los gastos de vehículo sí se pueden guardar."}
          </p>
        </div>

        {home.activeTrip ? (
          <p className="rounded-xl bg-muted px-4 py-3 text-sm">
            Flete {formatCurrency(home.activeTrip.freightValue)}
          </p>
        ) : null}

        {home.categories.length > 0 ? (
          <DriverExpenseForm
            organizationId={home.driver.organizationId}
            categories={home.categories}
            tripId={home.activeTrip?.id}
            vehicleMode={!home.activeTrip}
            assignedVehicle={home.assignedVehicle}
            submitLabel="Guardar sin conexión"
          />
        ) : (
          <p className="text-sm text-muted-foreground">
            No hay categorías en el dispositivo. Conéctate una vez para
            descargarlas.
          </p>
        )}
      </div>
    </div>
  );
}
