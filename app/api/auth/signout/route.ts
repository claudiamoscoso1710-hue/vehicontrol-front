import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { ORG_COOKIE_NAME } from "@/lib/auth/org-cookie";
import { ROLE_COOKIE_NAME } from "@/lib/auth/role-cookie";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  await supabase.auth.signOut();

  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE_NAME);
  cookieStore.delete(ORG_COOKIE_NAME);

  const loginUrl = new URL("/login", request.url);
  const response = NextResponse.redirect(loginUrl, 303);
  response.cookies.delete(ROLE_COOKIE_NAME);
  response.cookies.delete(ORG_COOKIE_NAME);
  return response;
}
