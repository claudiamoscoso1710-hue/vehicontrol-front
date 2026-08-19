import type { Metadata, Viewport } from "next";
import { DriverShell } from "@/components/driver/driver-shell";
import { getDriverContext } from "@/lib/auth/cached-auth";
import { loadDriverVehicleExpenseReminders } from "@/lib/reports/load-vehicle-expense-reminders";

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

export default async function DriverLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getDriverContext();
  const reminders = ctx
    ? await loadDriverVehicleExpenseReminders(ctx.supabase, ctx.driver.id)
    : [];

  return (
    <DriverShell reminders={reminders}>{children}</DriverShell>
  );
}
