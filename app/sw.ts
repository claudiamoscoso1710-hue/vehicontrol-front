/// <reference lib="esnext" />
/// <reference lib="webworker" />

import { defaultCache } from "@serwist/next/worker";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";
import { NetworkFirst, NetworkOnly, Serwist } from "serwist";

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [
    {
      matcher: ({ url }) =>
        url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ request, url }) =>
        request.destination === "document" &&
        (url.pathname.startsWith("/driver") || url.pathname === "/~offline"),
      handler: new NetworkFirst({
        cacheName: "driver-pages",
        networkTimeoutSeconds: 4,
      }),
    },
    ...defaultCache,
  ],
  fallbacks: {
    entries: [
      {
        url: "/~offline",
        matcher({ request }) {
          const url = new URL(request.url);
          return (
            request.destination === "document" &&
            (url.pathname.startsWith("/driver") || url.pathname === "/~offline")
          );
        },
      },
    ],
  },
});

serwist.addEventListeners();
