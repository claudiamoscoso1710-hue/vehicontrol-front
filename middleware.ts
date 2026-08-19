import { type NextRequest, NextResponse } from "next/server";
import {
  createMiddlewareClient,
  withCookies,
} from "@/lib/supabase/middleware";
import {
  canAccessPath,
  getHighestPriorityRole,
  getHomePathForRole,
  type MemberRole,
} from "@/lib/permissions/roles";
import {
  readCachedRole,
  readCachedRoleEntry,
  writeCachedRole,
} from "@/lib/auth/role-cookie";
import { writeCachedOrg } from "@/lib/auth/org-cookie";

const PUBLIC_PATHS = ["/login", "/auth/callback"];

function hasSupabaseSessionCookie(request: NextRequest): boolean {
  return request.cookies.getAll().some(
    (cookie) => cookie.name.startsWith("sb-") && cookie.name.includes("auth")
  );
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isServerAction = request.headers.has("next-action");
  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  if (isPublicPath && !hasSupabaseSessionCookie(request)) {
    return NextResponse.next();
  }

  const cachedRoleEntry = readCachedRoleEntry(request);

  // Fast path: cookie de rol + sesión → sin llamada a Supabase (~300–1400 ms ahorrados).
  if (
    cachedRoleEntry &&
    hasSupabaseSessionCookie(request) &&
    !isPublicPath &&
    pathname !== "/" &&
    !isServerAction
  ) {
    if (!canAccessPath(cachedRoleEntry.role, pathname)) {
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = getHomePathForRole(cachedRoleEntry.role);
      return NextResponse.redirect(homeUrl);
    }
    return NextResponse.next();
  }

  const { supabase, user, supabaseResponse } =
    await createMiddlewareClient(request);

  if (!user) {
    if (isPublicPath) return supabaseResponse;
    if (isServerAction) {
      return NextResponse.json(
        { error: "Sesión expirada. Vuelve a iniciar sesión." },
        { status: 401 }
      );
    }
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return withCookies(NextResponse.redirect(loginUrl), supabaseResponse);
  }

  let primaryRole = readCachedRole(request, user.id);

  if (!primaryRole) {
    const { data: memberships } = await supabase
      .from("organization_members")
      .select("role, organization_id, organizations(id, name)")
      .eq("user_id", user.id)
      .eq("status", "active");

    const roles = (memberships ?? []).map((m) => m.role as MemberRole);
    primaryRole = getHighestPriorityRole(roles);

    if (primaryRole && ["owner", "admin", "accountant"].includes(primaryRole)) {
      const priority: MemberRole[] = ["owner", "admin", "accountant"];
      const sorted = [...(memberships ?? [])].sort(
        (a, b) =>
          priority.indexOf(a.role as MemberRole) -
          priority.indexOf(b.role as MemberRole)
      );
      const membership = sorted[0];
      if (membership) {
        const orgData = membership.organizations;
        const org = Array.isArray(orgData) ? orgData[0] : orgData;
        writeCachedOrg(supabaseResponse, user.id, {
          organizationId: membership.organization_id,
          organizationName: (org as { name: string } | null)?.name ?? "Organización",
          role: membership.role as MemberRole,
        });
      }
    }

    if (!primaryRole) {
      const { data: driverProfile } = await supabase
        .from("drivers")
        .select("id")
        .eq("user_id", user.id)
        .eq("status", "active")
        .maybeSingle();

      if (driverProfile) {
        primaryRole = "driver";
      }
    }
  }

  if (isPublicPath) {
    if (primaryRole) {
      if (isServerAction) return supabaseResponse;
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = getHomePathForRole(primaryRole);
      const redirect = withCookies(
        NextResponse.redirect(homeUrl),
        supabaseResponse
      );
      writeCachedRole(redirect, user.id, primaryRole);
      return redirect;
    }
    return supabaseResponse;
  }

  if (pathname === "/") {
    if (isServerAction) return supabaseResponse;
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = primaryRole ? getHomePathForRole(primaryRole) : "/login";
    const redirect = withCookies(
      NextResponse.redirect(homeUrl),
      supabaseResponse
    );
    if (primaryRole) writeCachedRole(redirect, user.id, primaryRole);
    return redirect;
  }

  if (primaryRole && !canAccessPath(primaryRole, pathname)) {
    if (isServerAction) {
      return NextResponse.json(
        { error: "No tienes permiso para esta acción." },
        { status: 403 }
      );
    }
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = getHomePathForRole(primaryRole);
    const redirect = withCookies(
      NextResponse.redirect(homeUrl),
      supabaseResponse
    );
    writeCachedRole(redirect, user.id, primaryRole);
    return redirect;
  }

  if (primaryRole) {
    writeCachedRole(supabaseResponse, user.id, primaryRole);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
