import type { ReadonlyRequestCookies } from "next/dist/server/web/spec-extension/adapters/request-cookies";
import type { NextResponse } from "next/server";
import type { MemberRole } from "@/lib/permissions/roles";
import type { ActiveOrganization } from "@/lib/auth/get-active-organization";

const COOKIE_NAME = "vc-org";
const MAX_AGE_SECONDS = 30 * 60;

function encodeSegment(value: string): string {
  return encodeURIComponent(value);
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function readCachedOrg(
  cookies: ReadonlyRequestCookies,
  userId: string
): ActiveOrganization | null {
  const raw = cookies.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  const parts = raw.split("|");
  if (parts.length !== 4) return null;

  const [cachedUserId, organizationId, organizationName, role] = parts;
  if (cachedUserId !== userId || !organizationId) return null;

  const allowed: MemberRole[] = ["owner", "admin", "accountant"];
  if (!allowed.includes(role as MemberRole)) return null;

  return {
    organizationId,
    organizationName: decodeSegment(organizationName),
    role: role as MemberRole,
  };
}

export function writeCachedOrg(
  response: NextResponse,
  userId: string,
  org: ActiveOrganization
) {
  setCachedOrgCookieValue(userId, org, (name, value, options) => {
    response.cookies.set(name, value, options);
  });
}

export function setCachedOrgCookie(
  cookies: ReadonlyRequestCookies,
  userId: string,
  org: ActiveOrganization
) {
  setCachedOrgCookieValue(userId, org, (name, value, options) => {
    cookies.set(name, value, options);
  });
}

function setCachedOrgCookieValue(
  userId: string,
  org: ActiveOrganization,
  set: (
    name: string,
    value: string,
    options: {
      httpOnly: boolean;
      sameSite: "lax";
      secure: boolean;
      path: string;
      maxAge: number;
    }
  ) => void
) {
  set(
    COOKIE_NAME,
    [
      userId,
      org.organizationId,
      encodeSegment(org.organizationName),
      org.role,
    ].join("|"),
    {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: MAX_AGE_SECONDS,
    }
  );
}

export function clearCachedOrg(response: NextResponse) {
  response.cookies.set(COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export { COOKIE_NAME as ORG_COOKIE_NAME };
