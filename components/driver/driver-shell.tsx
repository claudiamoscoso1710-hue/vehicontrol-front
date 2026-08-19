"use client";

import { usePathname } from "next/navigation";
import { Home, History, Truck, LogOut, Wallet, Car } from "lucide-react";
import { useTransition } from "react";
import { signOut } from "@/lib/actions/auth";
import { NavLink } from "@/components/shared/navigation-provider";
import { NetworkStatusBanner } from "@/components/driver/network-status-banner";
import { ReminderBannerStack, ReminderBellButton } from "@/components/driver/reminder-ui";
import type { VehicleExpenseReminder } from "@/lib/reminders/vehicle-expense-reminders";
import { cn } from "@/lib/utils";

export function DriverShell({
  children,
  reminders = [],
}: {
  children: React.ReactNode;
  reminders?: VehicleExpenseReminder[];
}) {
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();

  const tabs = [
    { href: "/driver", label: "Inicio", icon: Home },
    { href: "/driver/vehicle-expenses", label: "Vehículo", icon: Car },
    { href: "/driver/account", label: "Cuenta", icon: Wallet },
    { href: "/driver/history", label: "Historial", icon: History },
  ];

  return (
    <div className="relative flex min-h-dvh flex-col bg-[radial-gradient(ellipse_at_top,_oklch(0.97_0.02_55)_0%,_var(--background)_55%)]">
      <header className="sticky top-0 z-20 border-b border-border/50 bg-card/85 backdrop-blur-xl supports-[backdrop-filter]:bg-card/70">
        <div className="mx-auto flex max-w-md items-center justify-between px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-brand text-brand-foreground shadow-md shadow-brand/20">
              <Truck className="h-5 w-5" />
            </div>
            <div>
              <p className="text-sm font-bold leading-none tracking-tight">
                SaaS Camiones
              </p>
              <p className="text-[11px] text-muted-foreground">Panel conductor</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <ReminderBellButton reminders={reminders} />
            <button
              type="button"
              onClick={() => startTransition(() => signOut())}
              disabled={pending}
              className="flex h-10 w-10 cursor-pointer items-center justify-center rounded-xl text-muted-foreground transition-all duration-150 hover:bg-muted hover:text-foreground active:scale-95 disabled:pointer-events-none disabled:opacity-50"
              aria-label="Cerrar sesión"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>
      <ReminderBannerStack reminders={reminders} />
      <NetworkStatusBanner />

      <main className="flex-1 pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
        {children}
      </main>

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-border/60 bg-card/95 backdrop-blur-xl supports-[backdrop-filter]:bg-card/85">
        <div className="mx-auto grid max-w-md grid-cols-4 px-1 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <NavLink
                key={tab.href}
                href={tab.href}
                isActive={active}
                showSpinner={false}
                className={cn(
                  "flex min-h-[3.25rem] flex-col items-center justify-center gap-0.5 rounded-2xl px-1 py-2 text-[10px] font-semibold transition-all duration-150 active:scale-95",
                  active
                    ? "bg-brand/15 text-brand shadow-sm"
                    : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-5 w-5",
                    active && "stroke-[2.5] text-brand"
                  )}
                />
                {tab.label}
              </NavLink>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
