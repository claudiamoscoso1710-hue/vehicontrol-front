"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const DRIVER_ROUTE_PREFIX = "/driver";

export function SwScopeGuard() {
  const pathname = usePathname();
  const isDriverRoute =
    pathname.startsWith(DRIVER_ROUTE_PREFIX) || pathname === "/~offline";

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    void navigator.serviceWorker.getRegistrations().then((registrations) => {
      if (isDriverRoute || registrations.length === 0) return;

      void Promise.all(
        registrations.map((registration) => registration.unregister())
      );
    });
  }, [isDriverRoute]);

  return null;
}
