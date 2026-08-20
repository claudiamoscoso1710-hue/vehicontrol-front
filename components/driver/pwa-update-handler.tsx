"use client";

import { useEffect } from "react";

export function PwaUpdateHandler() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    let reloaded = false;

    function reloadOnce() {
      if (reloaded) return;
      reloaded = true;
      window.location.reload();
    }

    void navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting) {
        registration.waiting.postMessage({ type: "SKIP_WAITING" });
      }

      registration.addEventListener("updatefound", () => {
        const worker = registration.installing;
        if (!worker) return;

        worker.addEventListener("statechange", () => {
          if (worker.state === "activated") {
            reloadOnce();
          }
        });
      });
    });

    navigator.serviceWorker.addEventListener("controllerchange", reloadOnce);

    return () => {
      navigator.serviceWorker.removeEventListener("controllerchange", reloadOnce);
    };
  }, []);

  return null;
}
