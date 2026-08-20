/** Viaje sin cliente: el conductor cobró el flete y debe entregarlo al dueño. */
export function driverHoldsFreight(
  clientId: string | null | undefined
): boolean {
  return !clientId;
}

export function freightHeldFromTrip(
  clientId: string | null | undefined,
  freightValue: number | null | undefined
): number {
  if (!driverHoldsFreight(clientId)) return 0;
  const freight = Number(freightValue ?? 0);
  return freight > 0 ? freight : 0;
}

export const DRIVER_HELD_FREIGHT_LABEL = "Flete en mano del conductor";
export const DRIVER_HELD_FREIGHT_SHORT = "Flete en mano";

export const DRIVER_HELD_FREIGHT_REGISTER_HINT =
  "Sin cliente: tú cobraste el flete en efectivo. Debes entregarlo al dueño del carro al liquidar (descontando sueldo y gastos reportados).";

export const DRIVER_HELD_FREIGHT_ACTIVE_HINT =
  "Sin cliente asignado: el flete de este viaje lo tienes tú en efectivo. Al cerrar el viaje y liquidar, debes entregarlo al dueño del carro.";

export const DRIVER_HELD_FREIGHT_OWNER_HINT =
  "Flete cobrado por el conductor (sin cliente). Pendiente de entrega en la liquidación de su cuenta.";
