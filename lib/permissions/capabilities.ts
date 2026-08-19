import type { MemberRole } from "./roles";

export type OrgCapabilities = {
  canManageFleet: boolean;
  canManageTrips: boolean;
  canViewExpenses: boolean;
  canManageTeam: boolean;
  canManageCategories: boolean;
  canManageExpenses: boolean;
  canViewCommercial: boolean;
};

const CAPABILITIES: Record<
  Extract<MemberRole, "owner" | "admin" | "accountant">,
  OrgCapabilities
> = {
  owner: {
    canManageFleet: true,
    canManageTrips: true,
    canViewExpenses: true,
    canManageTeam: true,
    canManageCategories: true,
    canManageExpenses: true,
    canViewCommercial: true,
  },
  admin: {
    canManageFleet: true,
    canManageTrips: true,
    canViewExpenses: true,
    canManageTeam: false,
    canManageCategories: false,
    canManageExpenses: true,
    canViewCommercial: false,
  },
  accountant: {
    canManageFleet: false,
    canManageTrips: false,
    canViewExpenses: true,
    canManageTeam: false,
    canManageCategories: true,
    canManageExpenses: false,
    canViewCommercial: false,
  },
};

export function getOrgCapabilities(
  role: MemberRole
): OrgCapabilities | null {
  if (role === "owner" || role === "admin" || role === "accountant") {
    return CAPABILITIES[role];
  }
  return null;
}
