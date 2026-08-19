"use client";

import { useEffect, useState } from "react";
import { CloudOff, RefreshCw, Wifi } from "lucide-react";
import { listQueuedExpenses } from "@/lib/offline/db";
import { useNetworkStatus } from "@/lib/offline/use-network-status";
import { syncQueuedExpenses } from "@/lib/offline/sync";

export function NetworkStatusBanner() {
  const status = useNetworkStatus();
  const [pending, setPending] = useState(0);
  const [syncing, setSyncing] = useState(false);

  async function refreshPending() {
    try {
      setPending((await listQueuedExpenses()).length);
    } catch {
      setPending(0);
    }
  }

  useEffect(() => {
    void refreshPending();
    const interval = window.setInterval(() => {
      void refreshPending();
    }, 8000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    if (status !== "online" && status !== "reconnecting") return;

    let cancelled = false;
    async function run() {
      setSyncing(true);
      try {
        await syncQueuedExpenses();
        if (!cancelled) await refreshPending();
      } finally {
        if (!cancelled) setSyncing(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "online" && pending === 0 && !syncing) return null;

  const label =
    status === "offline"
      ? pending > 0
        ? `Sin conexión · ${pending} gasto${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"}`
        : "Sin conexión. Puedes reportar gastos y se enviarán al reconectar."
      : syncing || status === "reconnecting"
        ? "Reconectando y sincronizando…"
        : `${pending} cambio${pending === 1 ? "" : "s"} pendiente${pending === 1 ? "" : "s"} de enviar`;

  return (
    <div
      className={`px-4 py-2 text-center text-xs font-medium ${
        status === "offline"
          ? "bg-amber-100 text-amber-950"
          : "bg-sky-100 text-sky-950"
      }`}
    >
      <span className="inline-flex items-center gap-1.5">
        {status === "offline" ? (
          <CloudOff className="h-3.5 w-3.5" />
        ) : syncing ? (
          <RefreshCw className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Wifi className="h-3.5 w-3.5" />
        )}
        {label}
      </span>
    </div>
  );
}
