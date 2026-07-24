// @ts-check
import { spawnSync } from "node:child_process";
import { serwist } from "@serwist/next/config";

const revision =
  spawnSync("git", ["rev-parse", "HEAD"], { encoding: "utf-8" }).stdout?.trim() ??
  crypto.randomUUID();

export default serwist({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  additionalPrecacheEntries: [
    { url: "/~offline", revision },
    { url: "/icons/icon-192.svg", revision },
    { url: "/icons/icon-512.svg", revision },
  ],
  precachePrerendered: false,
});
