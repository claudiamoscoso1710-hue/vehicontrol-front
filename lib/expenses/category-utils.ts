export function isOthersCategory(name: string): boolean {
  return name.trim().toLowerCase() === "otros";
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
