"use client";

import { createClient } from "@/lib/supabase/client";

export type BackendActionResult =
  | { success: true; [key: string]: unknown }
  | { success: false; error: string };

function getBackendUrl() {
  const url = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_BACKEND_URL no configurada. Apunta al API en Railway."
    );
  }
  return url.replace(/\/$/, "");
}

async function getAccessToken() {
  const supabase = createClient();
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (error || !session?.access_token) {
    throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  }

  return session.access_token;
}

export async function postBackendForm(
  path: string,
  formData: FormData
): Promise<BackendActionResult> {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
    cache: "no-store",
  });

  let data: BackendActionResult;
  try {
    data = (await response.json()) as BackendActionResult;
  } catch {
    throw new Error(
      response.ok
        ? "Respuesta inválida del servidor."
        : `Error del servidor (${response.status}). Verifica BACKEND_URL y CORS_ORIGIN en Railway.`
    );
  }

  if (!response.ok && data.success !== false) {
    return {
      success: false,
      error: `Error del servidor (${response.status}).`,
    };
  }

  return data;
}
