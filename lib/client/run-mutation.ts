"use client";

import { startTransition } from "react";
import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

type ActionResult = { success: boolean; error?: string };

type MutationOptions = {
  router?: AppRouterInstance;
  refresh?: boolean;
  onSuccess?: () => void;
  onError?: (message: string) => void;
  /** Apaga la barra de progreso global si quedó activa. */
  endNavigation?: () => void;
};

/**
 * Ejecuta una server action con loading seguro (finally) y refresh no bloqueante.
 */
export async function runMutation(
  action: () => Promise<ActionResult>,
  options: MutationOptions = {}
): Promise<ActionResult> {
  const { router, refresh = true, onSuccess, onError, endNavigation } = options;

  try {
    const result = await action();

    if (!result.success) {
      onError?.(result.error ?? "Ocurrió un error.");
      endNavigation?.();
      return result;
    }

    onSuccess?.();
    if (refresh && router) {
      startTransition(() => router.refresh());
    }
    endNavigation?.();

    return result;
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Error de conexión. Revisa que vehicontrol-back esté corriendo.";
    onError?.(message);
    endNavigation?.();
    return { success: false, error: message };
  }
}
