"use client";

import { useEffect, useState } from "react";

export type NetworkStatus = "online" | "offline" | "reconnecting";

export function useNetworkStatus(): NetworkStatus {
  const [status, setStatus] = useState<NetworkStatus>(() =>
    typeof navigator === "undefined" || navigator.onLine ? "online" : "offline"
  );

  useEffect(() => {
    function goOnline() {
      setStatus("reconnecting");
      window.setTimeout(() => {
        setStatus(navigator.onLine ? "online" : "offline");
      }, 600);
    }

    function goOffline() {
      setStatus("offline");
    }

    window.addEventListener("online", goOnline);
    window.addEventListener("offline", goOffline);
    return () => {
      window.removeEventListener("online", goOnline);
      window.removeEventListener("offline", goOffline);
    };
  }, []);

  return status;
}

export function isLikelyNetworkError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("fetch failed") ||
    message.includes("load failed") ||
    error.name === "TypeError"
  );
}
