"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, X } from "lucide-react";
import { driverUpdateExpense } from "@/lib/actions/expenses";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  compressImageFile,
  formatFileSize,
} from "@/lib/client/compress-image";
import {
  driverFieldClassName,
  driverTextareaClassName,
} from "@/components/driver/driver-ui";
import { isOthersCategory } from "@/lib/expenses/category-utils";

type Category = { id: string; name: string };

type Expense = {
  id: string;
  amount: number;
  notes: string | null;
  created_at: string;
  category_id: string;
  hasEvidence?: boolean;
  expense_categories: { name: string } | { name: string }[] | null;
};

type Props = {
  organizationId: string;
  categories: Category[];
  expenses: Expense[];
};

function getCategoryName(expense: Expense) {
  const c = expense.expense_categories;
  const row = Array.isArray(c) ? c[0] : c;
  return row?.name ?? "Gasto";
}

export function DriverExpenseList({
  organizationId,
  categories,
  expenses,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (expenses.length === 0) return null;

  return (
    <section className="space-y-3">
      <h2 className="px-1 text-sm font-semibold">Gastos de este viaje</h2>
      <ul className="space-y-2">
        {expenses.map((expense) => (
          <li key={expense.id}>
            {editingId === expense.id ? (
              <DriverEditExpenseForm
                organizationId={organizationId}
                expense={expense}
                categories={categories}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <DriverExpenseRow
                expenseId={expense.id}
                categoryName={getCategoryName(expense)}
                amount={Number(expense.amount)}
                dateLabel={new Date(expense.created_at).toLocaleDateString(
                  "es-CO"
                )}
                hasEvidence={expense.hasEvidence}
                onEdit={() => setEditingId(expense.id)}
              />
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

function DriverEditExpenseForm({
  organizationId,
  expense,
  categories,
  onCancel,
  onSaved,
}: {
  organizationId: string;
  expense: Expense;
  categories: Category[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const initialCategory = categories.find((c) => c.id === expense.category_id);
  const [categoryId, setCategoryId] = useState(expense.category_id);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const showOthersField = selectedCategory
    ? isOthersCategory(selectedCategory.name)
    : false;
  const [customDescription, setCustomDescription] = useState(() => {
    if (initialCategory && isOthersCategory(initialCategory.name)) {
      const parts = (expense.notes ?? "").split(" — ");
      return parts[0] ?? "";
    }
    return "";
  });

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const rawFormData = new FormData(form);
    const evidence = rawFormData.get("evidence");

    try {
      const formData = new FormData();
      formData.set("organizationId", organizationId);
      formData.set("expenseId", expense.id);
      formData.set("categoryId", String(rawFormData.get("categoryId") ?? ""));
      formData.set("amount", String(rawFormData.get("amount") ?? ""));
      formData.set("notes", String(rawFormData.get("notes") ?? ""));
      formData.set(
        "customDescription",
        String(rawFormData.get("customDescription") ?? "")
      );

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

      const result = await driverUpdateExpense(formData);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      router.refresh();
      onSaved();
      setLoading(false);
    } catch (err) {
      setCompressing(false);
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Error al procesar la imagen."
      );
    }
  }

  const busy = loading || compressing;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-3 rounded-2xl border border-brand/20 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold">Editar gasto</p>
        <button
          type="button"
          onClick={onCancel}
          className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted"
          aria-label="Cancelar"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Categoría</label>
        <select
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={driverFieldClassName()}
        >
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {showOthersField && (
        <div className="space-y-1.5">
          <label className="text-sm font-semibold">¿De qué es el gasto? *</label>
          <input
            name="customDescription"
            required
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            placeholder="Ej: Parqueadero, herramienta..."
            className={driverFieldClassName()}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Valor</label>
        <CurrencyInput
          name="amount"
          defaultValue={expense.amount}
          required
          className={driverFieldClassName("font-bold")}
        />
      </div>

      <div className="space-y-1.5">
        <label className="text-sm font-semibold">Notas</label>
        <textarea
          name="notes"
          rows={2}
          defaultValue={
            initialCategory && isOthersCategory(initialCategory.name)
              ? (expense.notes ?? "").split(" — ").slice(1).join(" — ")
              : (expense.notes ?? "")
          }
          className={driverTextareaClassName()}
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={`evidence-${expense.id}`} className="text-sm font-semibold">
          Nueva foto{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <label
          htmlFor={`evidence-${expense.id}`}
          className="flex min-h-[5rem] cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-brand/30 bg-brand/5 px-4 py-4"
        >
          <Camera className="mb-1 h-6 w-6 text-brand" />
          <span className="text-xs font-medium text-brand">Cambiar comprobante</span>
          <input
            id={`evidence-${expense.id}`}
            name="evidence"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf"
            capture="environment"
            className="sr-only"
            onChange={(e) => {
              const file = e.target.files?.[0];
              setFileInfo(file ? formatFileSize(file.size) : null);
            }}
          />
        </label>
        {fileInfo && (
          <p className="text-xs text-muted-foreground">{fileInfo}</p>
        )}
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4" />
          Gasto actualizado.
        </div>
      )}

      <Button
        type="submit"
        disabled={busy}
        className="h-12 w-full rounded-xl bg-brand font-semibold text-brand-foreground"
      >
        {compressing ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Comprimiendo...
          </>
        ) : loading ? (
          "Guardando..."
        ) : (
          "Guardar gasto"
        )}
      </Button>
    </form>
  );
}
