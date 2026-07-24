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

const PUBLIC_PATHS = ["/login", "/auth/callback"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isServerAction = request.headers.has("next-action");

  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/favicon") ||
    pathname.includes(".")
  ) {
    return NextResponse.next();
  }

  const { supabase, user, supabaseResponse } =
    await createMiddlewareClient(request);

  const isPublicPath = PUBLIC_PATHS.some((path) => pathname.startsWith(path));

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

  const { data: memberships } = await supabase
    .from("organization_members")
    .select("role")
    .eq("user_id", user.id)
    .eq("status", "active");

  const roles = (memberships ?? []).map((m) => m.role as MemberRole);
  let primaryRole = getHighestPriorityRole(roles);

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

  if (isPublicPath) {
    if (primaryRole) {
      if (isServerAction) return supabaseResponse;
      const homeUrl = request.nextUrl.clone();
      homeUrl.pathname = getHomePathForRole(primaryRole);
      return withCookies(NextResponse.redirect(homeUrl), supabaseResponse);
    }
    return supabaseResponse;
  }

  if (pathname === "/") {
    if (isServerAction) return supabaseResponse;
    const homeUrl = request.nextUrl.clone();
    homeUrl.pathname = primaryRole ? getHomePathForRole(primaryRole) : "/login";
    return withCookies(NextResponse.redirect(homeUrl), supabaseResponse);
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
    return withCookies(NextResponse.redirect(homeUrl), supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
