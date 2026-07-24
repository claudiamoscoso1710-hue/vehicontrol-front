export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(value);
}

/** Formato para inputs: 1.234.567 (sin símbolo $) */
export function formatCurrencyInput(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "";
  return new Intl.NumberFormat("es-CO", {
    maximumFractionDigits: 0,
  }).format(value);
}

/** Parsea texto con separadores colombianos a número entero */
export function parseCurrencyInput(value: string): number {
  const digits = value.replace(/\D/g, "");
  if (!digits) return 0;
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

/** Lee montos desde FormData (número plano o texto formateado) */
export function parseMoneyValue(
  value: FormDataEntryValue | null | undefined
): number {
  if (value == null || value === "") return 0;
  const str = String(value).trim();
  if (/[^\d]/.test(str)) {
    return parseCurrencyInput(str);
  }
  const parsed = Number(str);
  return Number.isFinite(parsed) ? parsed : 0;
}
