import Link from "next/link";
import { SignOutButton } from "@/components/shared/sign-out-button";
import {
  getOrgCapabilities,
  type OrgCapabilities,
} from "@/lib/permissions/capabilities";
import type { MemberRole } from "@/lib/permissions/roles";

const ROLE_LABELS: Record<string, string> = {
  owner: "Propietario",
  admin: "Administrador",
  accountant: "Contador",
};

type NavLink = {
  href: string;
  label: string;
  show: (caps: OrgCapabilities) => boolean;
};

const NAV_LINKS: NavLink[] = [
  { href: "/app", label: "Dashboard", show: () => true },
  { href: "/app/trips", label: "Viajes", show: () => true },
  {
    href: "/app/expenses",
    label: "Gastos",
    show: (c) => c.canViewExpenses,
  },
  {
    href: "/app/vehicles",
    label: "Vehículos",
    show: (c) => c.canManageFleet,
  },
  {
    href: "/app/drivers",
    label: "Conductores",
    show: (c) => c.canManageFleet,
  },
  { href: "/app/clients", label: "Clientes", show: (c) => c.canManageFleet },
  {
    href: "/app/settings",
    label: "Configuración",
    show: (c) => c.canManageTeam || c.canManageCategories,
  },
];

type Props = {
  role: MemberRole;
};

export function OwnerNav({ role }: Props) {
  const caps = getOrgCapabilities(role);
  if (!caps) return null;

  const links = NAV_LINKS.filter((link) => link.show(caps));

  return (
    <nav className="border-b bg-background">
      <div className="mx-auto flex max-w-4xl items-center justify-between gap-4 px-8 py-3">
        <div className="flex min-w-0 flex-1 gap-1 overflow-x-auto">
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
        <div className="flex shrink-0 items-center gap-3">
          <span className="hidden text-xs text-muted-foreground sm:inline">
            {ROLE_LABELS[role] ?? role}
          </span>
          <SignOutButton />
        </div>
      </div>
    </nav>
  );
}
