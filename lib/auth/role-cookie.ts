import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { NextRequest, NextResponse } from "next/server";
import type { MemberRole } from "@/lib/permissions/roles";

const COOKIE_NAME = "vc-role";
const MAX_AGE_SECONDS = 30 * 60;

const ALLOWED_ROLES: MemberRole[] = [
  "super_admin",
  "owner",
  "admin",
  "accountant",
  "driver",
];

export type CachedRoleEntry = {
  userId: string;
  role: MemberRole;
};

function parseRoleCookie(raw: string | undefined): CachedRoleEntry | null {
  if (!raw) return null;

  const separator = raw.indexOf(".");
  if (separator === -1) return null;

  const userId = raw.slice(0, separator);
  const role = raw.slice(separator + 1) as MemberRole;
  if (!userId || !ALLOWED_ROLES.includes(role)) return null;

  return { userId, role };
}

export function readCachedRoleEntry(request: NextRequest): CachedRoleEntry | null {
  return parseRoleCookie(request.cookies.get(COOKIE_NAME)?.value);
}

export function readCachedRoleEntryFromCookies(
  cookies: ReadonlyRequestCookies
): CachedRoleEntry | null {
  return parseRoleCookie(cookies.get(COOKIE_NAME)?.value);
}

export function readCachedRole(
  request: NextRequest,
  userId: string
): MemberRole | null {
  const entry = readCachedRoleEntry(request);
  if (!entry || entry.userId !== userId) return null;
  return entry.role;
}

export function writeCachedRole(
  response: NextResponse,
  userId: string,
  role: MemberRole
) {
  response.cookies.set(COOKIE_NAME, `${userId}.${role}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function setCachedRoleCookie(
  cookies: ReadonlyRequestCookies,
  userId: string,
  role: MemberRole
) {
  cookies.set(COOKIE_NAME, `${userId}.${role}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearCachedRole(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { COOKIE_NAME as ROLE_COOKIE_NAME };
