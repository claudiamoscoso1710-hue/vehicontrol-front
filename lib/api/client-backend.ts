"use client";

export type BackendActionResult =
  | { success: true; [key: string]: unknown }
  | { success: false; error: string };

function normalizeResult(data: unknown): BackendActionResult {
  if (
    data &&
    typeof data === "object" &&
    "success" in data &&
    typeof (data as { success: unknown }).success === "boolean"
  ) {
    const payload = data as BackendActionResult;
    if (!payload.success) {
      return {
        success: false,
        error:
          ("error" in payload && typeof payload.error === "string" && payload.error) ||
          "No se pudo completar la acción.",
      };
    }
    return payload;
  }

  return {
    success: false,
    error: "Respuesta inválida del servidor.",
  };
}

export async function postBackendForm(
  path: string,
  formData: FormData
): Promise<BackendActionResult> {
  const response = await fetch(`/api/backend${path}`, {
    method: "POST",
    body: formData,
    cache: "no-store",
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    throw new Error(
      response.ok
        ? "Respuesta inválida del servidor."
        : `Error del servidor (${response.status}). Intenta de nuevo en unos segundos.`
    );
  }

  const result = normalizeResult(data);

  if (!response.ok && result.success !== false) {
    return {
      success: false,
      error: `Error del servidor (${response.status}).`,
    };
  }

  return result;
}
