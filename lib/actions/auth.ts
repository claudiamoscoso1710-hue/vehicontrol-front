"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { ORG_COOKIE_NAME } from "@/lib/auth/org-cookie";
import { ROLE_COOKIE_NAME } from "@/lib/auth/role-cookie";
import { warmAuthCookies } from "@/lib/auth/warm-auth-cookies";

export type SignInState = { error: string } | null;

export async function signIn(
  _prev: SignInState,
  formData: FormData
): Promise<SignInState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email y contraseña son obligatorios." };
  }

  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      error:
        "Configuración incompleta: faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_ANON_KEY.",
    };
  }

  try {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      return { error: error.message };
    }

    if (data.user) {
      const cookieStore = await cookies();
      await warmAuthCookies(supabase, cookieStore, data.user.id);
    }
  } catch {
    return {
      error:
        "No se pudo conectar con el servidor de autenticación. Revisa tu conexión a internet.",
    };
  }

  redirect("/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  const cookieStore = await cookies();
  cookieStore.delete(ROLE_COOKIE_NAME);
  cookieStore.delete(ORG_COOKIE_NAME);
}
