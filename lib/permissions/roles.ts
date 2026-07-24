export type MemberRole =
  | "super_admin"
  | "owner"
  | "admin"
  | "accountant"
  | "driver";

export const ROLE_PRIORITY: Record<MemberRole, number> = {
  super_admin: 0,
  owner: 1,
  admin: 2,
  accountant: 3,
  driver: 4,
};

export const ROLE_HOME_PATH: Record<MemberRole, string> = {
  super_admin: "/admin",
  owner: "/app",
  admin: "/app",
  accountant: "/app",
  driver: "/driver",
};

export function getHighestPriorityRole(
  roles: MemberRole[]
): MemberRole | null {
  if (roles.length === 0) return null;

  return roles.reduce((highest, role) =>
    ROLE_PRIORITY[role] < ROLE_PRIORITY[highest] ? role : highest
  );
}

export function getHomePathForRole(role: MemberRole): string {
  return ROLE_HOME_PATH[role];
}

export function canAccessPath(role: MemberRole, pathname: string): boolean {
  if (pathname.startsWith("/admin")) {
    return role === "super_admin";
  }

  if (pathname.startsWith("/driver")) {
    return role === "driver";
  }

  if (pathname.startsWith("/app")) {
    return role === "owner" || role === "admin" || role === "accountant";
  }

  return true;
}
