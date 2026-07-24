import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-6 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <WifiOff className="h-8 w-8" />
      </div>
      <h1 className="mt-6 text-xl font-bold">Sin conexión</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        No hay internet. Revisa tu señal e intenta de nuevo cuando vuelvas a
        estar en línea.
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
