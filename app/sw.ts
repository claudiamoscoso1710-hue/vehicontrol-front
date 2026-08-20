/// <reference lib="esnext" />
/// <reference lib="webworker" />

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
      matcher: ({ request }) => request.method !== "GET",
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) => url.pathname.startsWith("/_next/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.hostname.includes("supabase.co") || url.pathname.startsWith("/api/"),
      handler: new NetworkOnly(),
    },
    {
      matcher: ({ url }) =>
        url.pathname.startsWith("/app") ||
        url.pathname.startsWith("/admin") ||
        url.pathname.startsWith("/login") ||
        url.pathname.startsWith("/auth"),
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
