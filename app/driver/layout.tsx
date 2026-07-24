import type { Metadata, Viewport } from "next";
import { DriverShell } from "@/components/driver/driver-shell";
import { PwaRegister } from "@/components/driver/pwa-register";

export const metadata: Metadata = {
  title: "Conductor · SaaS Camiones",
  description: "Reporta gastos y gestiona tu viaje activo",
  applicationName: "SaaS Camiones Conductor",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Conductor",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#c2410c",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PwaRegister>
      <DriverShell>{children}</DriverShell>
    </PwaRegister>
  );
}
