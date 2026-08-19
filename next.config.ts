import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const withSerwist = withSerwistInit({
  swSrc: "app/sw.ts",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});

const nextConfig: NextConfig = {
  reactCompiler: true,
  experimental: {
    // Por defecto Next 15+ no cachea páginas dinámicas (dynamic: 0).
    // 30s permite volver a un apartado sin refetch completo si los datos no cambiaron.
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
};

export default withSerwist(nextConfig);
