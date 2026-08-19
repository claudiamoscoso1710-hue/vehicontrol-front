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

const BACKEND_TIMEOUT_MS = 20_000;

async function fetchBackend(path: string, init: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), BACKEND_TIMEOUT_MS);

  try {
    return await fetch(`${getBackendUrl()}${path}`, {
      ...init,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "El servidor tardó demasiado en responder. Verifica que vehicontrol-back esté corriendo."
      );
    }
    throw new Error(
      "No se pudo conectar con el backend. ¿Está vehicontrol-back en marcha (puerto 8080)?"
    );
  } finally {
    clearTimeout(timeoutId);
  }
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
  const text = await response.text();
  let data: T | null = null;

  if (text) {
    try {
      data = JSON.parse(text) as T;
    } catch {
      // Respuesta no JSON (p. ej. "Internal Server Error" de Hono).
    }
  }

  if (!response.ok) {
    const fromJson =
      data &&
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof (data as { error?: unknown }).error === "string"
        ? (data as { error: string }).error
        : null;

    throw new Error(
      fromJson ??
        (text && text.length < 200
          ? `Backend ${response.status}: ${text}`
          : `Backend respondió ${response.status}. Revisa vehicontrol-back (SUPABASE_URL/SUPABASE_ANON_KEY) y BACKEND_URL.`)
    );
  }

  if (data === null) {
    throw new Error("Respuesta inválida del servidor.");
  }

  return data;
}

export async function callBackendJson<T>(
  path: string,
  body: Record<string, unknown>
): Promise<T> {
  const token = await getAccessToken();
  const response = await fetchBackend(path, {
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

  const response = await fetchBackend(path, {
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
