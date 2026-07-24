import Link from "next/link";
import { SignOutButton } from "@/components/shared/sign-out-button";

const links = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/vehicles", label: "Vehículos pendientes" },
  { href: "/admin/organizations", label: "Organizaciones" },
  { href: "/admin/subscriptions", label: "Suscripciones" },
];

export function AdminNav() {
  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-4xl items-center justify-between px-8 py-3">
        <div className="flex gap-1 overflow-x-auto">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-md px-3 py-1.5 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </div>
        <SignOutButton />
      </div>
    </nav>
  );
}
