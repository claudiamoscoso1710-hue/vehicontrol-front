"use client";

import { useCallback, useEffect, useState } from "react";
import { Download, Smartphone, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  detectPwaInstallPlatform,
  getPwaInstallButtonLabel,
  getPwaInstallHelp,
  isBeforeInstallPromptEvent,
  isPwaInstalled,
  type BeforeInstallPromptEvent,
  type PwaInstallPlatform,
} from "@/lib/client/pwa-install";

const PLATFORM_TAGS = ["Android", "iPhone", "Windows", "Mac"] as const;

export function PwaInstallButton() {
  const [installed, setInstalled] = useState(false);
  const [platform, setPlatform] = useState<PwaInstallPlatform>("unknown");
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [showHelp, setShowHelp] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setInstalled(isPwaInstalled());
    setPlatform(detectPwaInstallPlatform());

    function onBeforeInstall(event: Event) {
      event.preventDefault();
      if (isBeforeInstallPromptEvent(event)) {
        setDeferredPrompt(event);
      }
    }

    function onInstalled() {
      setInstalled(true);
      setDeferredPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    window.addEventListener("appinstalled", onInstalled);

    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      void navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }

    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = useCallback(async () => {
    if (platform === "ios") {
      setShowHelp(true);
      return;
    }

    if (deferredPrompt) {
      setInstalling(true);
      try {
        await deferredPrompt.prompt();
        const choice = await deferredPrompt.userChoice;
        if (choice.outcome === "accepted") {
          setInstalled(true);
        }
        setDeferredPrompt(null);
      } finally {
        setInstalling(false);
      }
      return;
    }

    setShowHelp(true);
  }, [deferredPrompt, platform]);

  if (installed) {
    return (
      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-center">
        <p className="text-sm font-medium text-emerald-800">
          App del conductor instalada
        </p>
        <p className="mt-0.5 text-xs text-emerald-700">
          Ábrela desde tu pantalla de inicio o el menú de aplicaciones.
        </p>
      </div>
    );
  }

  const help = getPwaInstallHelp(platform);
  const buttonLabel = getPwaInstallButtonLabel(platform, installing);

  return (
    <>
      <div className="rounded-xl border border-dashed border-brand/30 bg-brand/5 px-4 py-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand/10 text-brand">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold">App para conductores</p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {platform === "android"
                ? "Instala la app en tu celular Android para reportar gastos y viajes sin abrir el navegador."
                : platform === "ios"
                  ? "Añádela a la pantalla de inicio en iPhone o iPad desde Safari."
                  : platform === "desktop"
                    ? "Instala como app en tu computador (Windows o Mac)."
                    : "Disponible en Android, iPhone, Windows y Mac."}
            </p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {PLATFORM_TAGS.map((tag) => {
                const active =
                  (tag === "Android" && platform === "android") ||
                  (tag === "iPhone" && platform === "ios") ||
                  ((tag === "Windows" || tag === "Mac") && platform === "desktop");
                return (
                  <span
                    key={tag}
                    className={
                      active
                        ? "rounded-full bg-brand px-2 py-0.5 text-[10px] font-semibold text-brand-foreground"
                        : "rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                    }
                  >
                    {tag}
                  </span>
                );
              })}
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 gap-1.5 border-brand/30 bg-background hover:bg-brand/5"
              onClick={() => void handleInstall()}
              disabled={installing}
            >
              <Download className="h-4 w-4" />
              {buttonLabel}
            </Button>
          </div>
        </div>
      </div>

      {showHelp ? (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-4 sm:items-center"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pwa-install-help-title"
        >
          <div className="w-full max-w-md rounded-2xl bg-card p-5 shadow-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p
                  id="pwa-install-help-title"
                  className="text-base font-semibold"
                >
                  {help.title}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  La app abre en el panel del conductor (/driver).
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowHelp(false)}
                className="rounded-lg p-1 text-muted-foreground hover:bg-muted"
                aria-label="Cerrar"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <ol className="mt-4 space-y-2 text-sm text-foreground">
              {help.steps.map((step, index) => (
                <li key={step} className="flex gap-2">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand/10 text-xs font-semibold text-brand">
                    {index + 1}
                  </span>
                  <span>{step}</span>
                </li>
              ))}
            </ol>
            <Button
              type="button"
              className="mt-5 w-full"
              onClick={() => setShowHelp(false)}
            >
              Entendido
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
