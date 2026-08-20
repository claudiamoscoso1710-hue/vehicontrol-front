"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, Plus, X } from "lucide-react";
import { ownerCreateTripExpense } from "@/lib/actions/expenses";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  compressImageFile,
  formatFileSize,
} from "@/lib/client/compress-image";
import {
  EXPENSE_SCOPE_META,
  filterCategoriesByScope,
  type ExpenseScope,
} from "@/lib/expenses/expense-scope";
import { isOthersCategory } from "@/lib/expenses/category-utils";

type Category = { id: string; name: string; scope?: "trip" | "vehicle" };

type Props = {
  organizationId: string;
  tripId: string;
  categories: Category[];
};

const SCOPE_OPTIONS: ExpenseScope[] = ["trip", "additional", "vehicle"];

export function OwnerCreateTripExpenseForm({
  organizationId,
  tripId,
  categories,
}: Props) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [expenseScope, setExpenseScope] = useState<ExpenseScope>("trip");
  const [categoryId, setCategoryId] = useState("");
  const [customDescription, setCustomDescription] = useState("");
  const [ownerPrepaid, setOwnerPrepaid] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const scopedCategories =
    expenseScope === "vehicle"
      ? filterCategoriesByScope(categories, "vehicle")
      : filterCategoriesByScope(categories, "trip");

  const selectedCategory = scopedCategories.find((c) => c.id === categoryId);
  const showOthersField =
    expenseScope !== "additional" &&
    selectedCategory &&
    isOthersCategory(selectedCategory.name);

  function resetForm() {
    setCategoryId("");
    setCustomDescription("");
    setOwnerPrepaid(false);
    setError(null);
    setFileInfo(null);
    formRef.current?.reset();
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setLoading(true);
    setError(null);

    const rawFormData = new FormData(form);
    const evidence = rawFormData.get("evidence");

    try {
      const formData = new FormData();
      formData.set("organizationId", organizationId);
      formData.set("tripId", tripId);
      formData.set("expenseScope", expenseScope);
      formData.set("categoryId", expenseScope === "additional" ? "" : categoryId);
      formData.set("amount", String(rawFormData.get("amount") ?? ""));
      formData.set("notes", String(rawFormData.get("notes") ?? ""));
      formData.set("customDescription", customDescription);
      if (ownerPrepaid && expenseScope !== "vehicle") {
        formData.set("ownerPrepaid", "true");
      }

      if (evidence instanceof File && evidence.size > 0) {
        setCompressing(true);
        const compressed = await compressImageFile(evidence);
        setCompressing(false);
        formData.set("evidence", compressed.file, compressed.file.name);
        if (compressed.wasCompressed) {
          setFileInfo(
            `Comprimida: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`
          );
        }
      }

      const result = await ownerCreateTripExpense(formData);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      resetForm();
      setOpen(false);
      router.refresh();
      setLoading(false);
    } catch (err) {
      setCompressing(false);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Error al registrar el gasto.");
    }
  }

  const busy = loading || compressing;

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-brand/40 bg-brand/5 px-4 py-3 text-sm font-medium text-brand hover:bg-brand/10"
      >
        <Plus className="h-4 w-4" />
        Agregar gasto al viaje
      </button>
    );
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-4 rounded-xl border border-brand/20 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Nuevo gasto</p>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            resetForm();
          }}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-2">
        <p className="text-sm font-medium">Tipo de gasto</p>
        <div className="flex flex-wrap gap-2">
          {SCOPE_OPTIONS.map((scope) => (
            <button
              key={scope}
              type="button"
              onClick={() => {
                setExpenseScope(scope);
                setCategoryId("");
                setCustomDescription("");
              }}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                expenseScope === scope
                  ? EXPENSE_SCOPE_META[scope].badgeClass
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {EXPENSE_SCOPE_META[scope].label}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {expenseScope === "trip"
            ? "Gasto operativo del viaje (peajes, alimentación, etc.)."
            : expenseScope === "additional"
              ? "Reembolsable pero no reduce la base del sueldo del conductor."
              : "Gasto del vehículo durante este viaje (SOAT, mantenimiento, etc.)."}
        </p>
      </div>

      {expenseScope !== "vehicle" ? (
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={ownerPrepaid}
            onChange={(e) => setOwnerPrepaid(e.target.checked)}
          />
          Anticipado (empresa pagó directo)
        </label>
      ) : null}

      {expenseScope === "additional" ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción del gasto adicional *</label>
          <input
            required
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Ej. Reparación urgente en ruta"
          />
        </div>
      ) : scopedCategories.length > 0 ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoría *</label>
          <select
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            <option value="">Seleccionar...</option>
            {scopedCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-900">
          No hay categorías de{" "}
          {expenseScope === "vehicle" ? "vehículo" : "viaje"} configuradas. Créalas
          en Configuración.
        </p>
      )}

      {showOthersField ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">¿De qué es el gasto? *</label>
          <input
            required
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Valor *</label>
        <CurrencyInput
          name="amount"
          required
          placeholder="0"
          className="w-full rounded-md border px-3 py-2 text-sm font-semibold"
        />
      </div>

      {expenseScope !== "additional" ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            name="notes"
            rows={2}
            className="w-full rounded-md border px-3 py-2 text-sm"
            placeholder="Opcional"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Evidencia (opcional)</label>
        <label className="flex min-h-[4rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand/30 bg-brand/5 px-4 py-3">
          <Camera className="mb-1 h-5 w-5 text-brand" />
          <span className="text-xs font-medium text-brand">Adjuntar comprobante</span>
          <input
            name="evidence"
            type="file"
            accept="image/jpeg,image/png,image/webp,application/pdf"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileInfo(file ? formatFileSize(file.size) : null);
            }}
          />
        </label>
        {fileInfo ? <p className="text-xs text-muted-foreground">{fileInfo}</p> : null}
      </div>

      {error ? (
        <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
      ) : null}

      <Button
        type="submit"
        disabled={
          busy ||
          (expenseScope !== "additional" && scopedCategories.length === 0)
        }
        size="sm"
      >
        {busy ? "Guardando..." : "Registrar gasto"}
      </Button>
    </form>
  );
}
