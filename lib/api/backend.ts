"use server";

import { createClient } from "@/lib/supabase/server";

function getBackendUrl() {
  const url = process.env.BACKEND_URL ?? process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!url) {
    throw new Error(
      "BACKEND_URL no configurada. Apunta al servicio Railway (vehicontrol-back)."
    );
  }
  return url.replace(/\/$/, "");
}

async function getAccessToken() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    throw new Error("Sesión expirada. Vuelve a iniciar sesión.");
  }

  return session.access_token;
}

async function parseBackendResponse<T>(response: Response): Promise<T> {
  let data: T;
  try {
    data = (await response.json()) as T;
  } catch {
    throw new Error(
      response.ok
        ? "Respuesta inválida del servidor."
        : `Error del servidor (${response.status}). Verifica BACKEND_URL en Netlify.`
    );
  }

  return data;
}

export async function callBackendJson<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
    cache: "no-store",
  });

  return parseBackendResponse<T>(response);
}

export async function callBackendForm<T>(
  path: string,
  organizationId: string,
  formData: FormData
): Promise<T> {
  const token = await getAccessToken();
  const payload = new FormData();
  if (organizationId) {
    payload.set("organizationId", organizationId);
  }
  formData.forEach((value, key) => {
    payload.set(key, value);
  });

  const response = await fetch(`${getBackendUrl()}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: payload,
    cache: "no-store",
  });

  return parseBackendResponse<T>(response);
}

export async function getBackendEvidenceUrl(expenseId: string) {
  const token = await getAccessToken();
  const response = await fetch(`${getBackendUrl()}/api/evidences/${expenseId}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { url?: string };
  return data.url ?? null;
}
