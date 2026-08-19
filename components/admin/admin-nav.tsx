"use client";

import { usePathname } from "next/navigation";
import { SignOutButton } from "@/components/shared/sign-out-button";
import { NavLink } from "@/components/shared/navigation-provider";
import { cn } from "@/lib/utils";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/vehicles", label: "Vehículos" },
  { href: "/admin/organizations", label: "Organizaciones" },
  { href: "/admin/subscriptions", label: "Suscripciones" },
];

export function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-8 py-3">
        <div className="flex gap-1 overflow-x-auto">
          {links.map((link) => {
            const active =
              pathname === link.href ||
              (link.href !== "/admin" && pathname.startsWith(link.href));

            return (
              <NavLink
                key={link.href}
                href={link.href}
                isActive={active}
                showSpinner={false}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-1.5 text-sm transition-all duration-150 active:scale-[0.98]",
                  active
                    ? "bg-muted font-medium text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </NavLink>
            );
          })}
        </div>
        <SignOutButton />
      </div>
    </nav>
  );
}
