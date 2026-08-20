import { isLikelyNetworkError } from "@/lib/offline/use-network-status";

const ACTION_TIMEOUT_MS = 45_000;

function isStaleClientError(error: unknown) {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("server action") ||
    message.includes("failed to find server action") ||
    message.includes("unrecognizedactionerror")
  );
}

export async function runDriverAction<
  T extends { success: boolean; error?: string },
>(action: () => Promise<T>): Promise<T> {
  try {
    return await Promise.race([
      action(),
      new Promise<T>((_, reject) => {
        window.setTimeout(
          () => reject(new Error("__driver_action_timeout__")),
          ACTION_TIMEOUT_MS
        );
      }),
    ]);
  } catch (error) {
    if (error instanceof Error && error.message === "__driver_action_timeout__") {
      return {
        success: false,
        error:
          "La solicitud tardó demasiado. Revisa tu conexión, recarga la app e intenta de nuevo.",
      } as T;
    }

    if (isStaleClientError(error)) {
      return {
        success: false,
        error:
          "Hay una actualización de la app. Ciérrala por completo, ábrela de nuevo y repite.",
      } as T;
    }

    if (isLikelyNetworkError(error)) {
      return {
        success: false,
        error: "Sin conexión estable. Intenta cuando tengas señal.",
      } as T;
    }

    return {
      success: false,
      error: "No se pudo completar la acción. Recarga la app e intenta de nuevo.",
    } as T;
  }
}
