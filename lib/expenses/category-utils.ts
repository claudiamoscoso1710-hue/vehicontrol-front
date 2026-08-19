export function isOthersCategory(name: string): boolean {
  return name.trim().toLowerCase() === "otros";
}

/** Primera parte de `notes` cuando la categoría es Otros (ej. "Parqueadero"). */
export function getOthersExpenseDetail(
  categoryName: string,
  notes: string | null | undefined
): string | null {
  if (!isOthersCategory(categoryName)) return null;
  const trimmed = notes?.trim();
  if (!trimmed) return null;
  return trimmed.split(" — ")[0]?.trim() || null;
}

/** Notas adicionales tras la descripción de Otros. */
export function getOthersExpenseExtraNotes(
  categoryName: string,
  notes: string | null | undefined
): string | null {
  if (!isOthersCategory(categoryName)) return null;
  const trimmed = notes?.trim();
  if (!trimmed) return null;
  const extra = trimmed.split(" — ").slice(1).join(" — ").trim();
  return extra || null;
}

export const VEHICLE_EXPENSE_CATEGORY_NAMES = [
  "SOAT",
  "Rodamiento",
  "Mantenimiento",
  "Repuestos",
  "Lavado",
  "Otros",
] as const;

export function buildExpenseNotes(
  categoryName: string,
  customDescription: string,
  notes: string
): string | null {
  const extra = notes.trim();
  if (isOthersCategory(categoryName)) {
    const description = customDescription.trim();
    if (!description) return null;
    return extra ? `${description} — ${extra}` : description;
  }
  return extra || null;
}
