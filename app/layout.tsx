import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import { NavigationProvider } from "@/components/shared/navigation-provider";
import { SwScopeGuard } from "@/components/shared/sw-scope-guard";
import "./globals.css";

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-plus-jakarta",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SaaS Camiones",
  description: "Gestión financiera y operativa de flotas de carga",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "SaaS Camiones",
    statusBarStyle: "default",
  },
  icons: {
    apple: [{ url: "/icons/icon-192.svg", sizes: "192x192", type: "image/svg+xml" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="es"
      className={`${plusJakarta.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col font-sans">
        <SwScopeGuard />
        <NavigationProvider>{children}</NavigationProvider>
      </body>
    </html>
  );
}
