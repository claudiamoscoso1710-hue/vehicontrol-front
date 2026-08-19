"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Route,
  Receipt,
  Truck,
  Users,
  Building2,
  Settings,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink } from "@/components/shared/navigation-provider";
import {
  getOrgCapabilities,
  type OrgCapabilities,
} from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/lib/permissions/roles";
import { cn } from "@/lib/utils";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
};

type NavItem = {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  show: (caps: OrgCapabilities) => boolean;
};

const NAV: NavItem[] = [
  { href: "/app", label: "Dashboard", icon: LayoutDashboard, show: () => true },
  { href: "/app/trips", label: "Viajes", icon: Route, show: () => true },
  { href: "/app/expenses", label: "Gastos", icon: Receipt, show: (c) => c.canViewExpenses },
  { href: "/app/vehicles", label: "Vehículos", icon: Truck, show: (c) => c.canManageFleet },
  { href: "/app/drivers", label: "Conductores", icon: Users, show: (c) => c.canManageFleet },
  { href: "/app/clients", label: "Clientes", icon: Building2, show: (c) => c.canManageFleet },
  { href: "/app/settings", label: "Configuración", icon: Settings, show: (c) => c.canManageTeam || c.canManageCategories },
];

type Props = {
  role: MemberRole;
  orgName: string;
  userEmail?: string;
};

export function OwnerShell({ role, orgName, userEmail, children }: Props & { children: React.ReactNode }) {
  const caps = getOrgCapabilities(role);
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [pending, setPending] = useState(false);

  if (!caps) return <>{children}</>;

  const links = NAV.filter((l) => l.show(caps));

  const navContent = (
    <>
      <div className="border-b border-white/10 px-5 py-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-brand text-brand-foreground">
            <Truck className="h-5 w-5" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-bold text-white">SaaS Camiones</p>
            <p className="truncate text-xs text-slate-400">{orgName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4">
        {links.map((item) => {
          const active =
            pathname === item.href ||
            (item.href !== "/app" && pathname.startsWith(item.href));
          const Icon = item.icon;
          return (
            <NavLink
              key={item.href}
              href={item.href}
              onClick={() => setMobileOpen(false)}
              isActive={active}
              showSpinner={false}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-150 active:scale-[0.98]",
                active
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "text-slate-300 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 p-4">
        <div className="mb-3 rounded-lg bg-white/5 px-3 py-2">
          <p className="text-xs font-medium text-slate-300">{ROLE_LABELS[role] ?? role}</p>
          <p className="truncate text-xs text-slate-500">{userEmail}</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setPending(true);
            const form = document.createElement("form");
            form.method = "POST";
            form.action = "/api/auth/signout";
            document.body.appendChild(form);
            form.submit();
          }}
          disabled={pending}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-400 transition-all duration-150 hover:bg-white/10 hover:text-white active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
        >
          <LogOut className="h-4 w-4" />
          {pending ? "Saliendo..." : "Cerrar sesión"}
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-surface">
      {/* Mobile header */}
      <header className="sticky top-0 z-40 flex items-center justify-between border-b border-border/80 bg-card px-4 py-3 lg:hidden">
        <button
          type="button"
          onClick={() => setMobileOpen(true)}
          className="cursor-pointer rounded-lg p-2 transition-all duration-150 hover:bg-muted active:scale-95"
          aria-label="Abrir menú"
        >
          <Menu className="h-5 w-5" />
        </button>
        <p className="text-sm font-semibold">{orgName}</p>
        <div className="w-9" />
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
            aria-label="Cerrar menú"
          />
          <aside className="relative flex h-full w-72 max-w-[85vw] flex-col bg-sidebar text-sidebar-foreground shadow-xl">
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-lg p-1.5 text-slate-400 hover:bg-white/10"
            >
              <X className="h-5 w-5" />
            </button>
            {navContent}
          </aside>
        </div>
      )}

      <div className="lg:flex">
        <aside className="hidden w-64 shrink-0 flex-col bg-sidebar text-sidebar-foreground lg:fixed lg:inset-y-0 lg:flex">
          {navContent}
        </aside>

        <main className="min-w-0 flex-1 lg:pl-64">
          <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
