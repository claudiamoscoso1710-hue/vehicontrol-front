"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Camera, CheckCircle2, Loader2, Trash2, X } from "lucide-react";
import {
  ownerDeleteExpense,
  ownerUpdateExpense,
} from "@/lib/actions/expenses";
import { DriverExpenseRow } from "@/components/driver/driver-expense-row";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import {
  compressImageFile,
  formatFileSize,
} from "@/lib/client/compress-image";
import {
  getAdditionalExpenseDescription,
  getExpenseDisplayTitle,
  resolveExpenseScope,
} from "@/lib/expenses/expense-scope";
import {
  getOthersExpenseDetail,
  isOthersCategory,
} from "@/lib/expenses/category-utils";

type Category = { id: string; name: string; scope?: "trip" | "vehicle" };

export type OwnerManageExpense = {
  id: string;
  amount: number;
  notes: string | null;
  owner_prepaid?: boolean;
  additional_trip_expense?: boolean;
  created_at: string;
  category_id?: string | null;
  trip_id?: string | null;
  settlement_id?: string | null;
  tripLabel?: string | null;
  vehiclePlate?: string | null;
  expense_categories: { name: string } | { name: string }[] | null;
  drivers: { full_name: string } | { full_name: string }[] | null;
  hasEvidence?: boolean;
};

type Props = {
  organizationId: string;
  categories: Category[];
  expenses: OwnerManageExpense[];
  emptyMessage?: string;
  showSettlementStatus?: boolean;
};

function getCategoryName(expense: OwnerManageExpense) {
  const c = expense.expense_categories;
  const row = Array.isArray(c) ? c[0] : c;
  return row?.name ?? "Gasto";
}

export function OwnerManageExpenseList({
  organizationId,
  categories,
  expenses,
  emptyMessage = "No hay gastos.",
  showSettlementStatus = true,
}: Props) {
  const [editingId, setEditingId] = useState<string | null>(null);

  if (expenses.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <ul className="space-y-2">
      {expenses.map((expense) => {
        const categoryName = getCategoryName(expense);
        const isAdditional = Boolean(expense.additional_trip_expense);
        const isSettled = Boolean(expense.settlement_id);
        const scope = resolveExpenseScope({
          tripId: expense.trip_id,
          additionalTripExpense: isAdditional,
        });
        const displayTitle = getExpenseDisplayTitle({
          scope,
          categoryName,
          notes: expense.notes,
        });
        const driver = Array.isArray(expense.drivers)
          ? expense.drivers[0]
          : expense.drivers;
        const scopeLabel =
          scope === "vehicle"
            ? `Gasto del vehículo${expense.vehiclePlate ? ` · ${expense.vehiclePlate}` : ""}`
            : expense.tripLabel ?? "Gasto de viaje";
        const settlementLabel = isSettled ? "Liquidado" : "Pendiente de liquidar";
        const statusSuffix = showSettlementStatus ? ` · ${settlementLabel}` : "";

        return (
          <li key={expense.id}>
            {editingId === expense.id && !isSettled ? (
              <OwnerEditExpenseForm
                organizationId={organizationId}
                expense={expense}
                categories={categories}
                onCancel={() => setEditingId(null)}
                onSaved={() => setEditingId(null)}
              />
            ) : (
              <DriverExpenseRow
                expenseId={expense.id}
                categoryName={displayTitle}
                categoryDetail={
                  scope === "additional"
                    ? null
                    : getOthersExpenseDetail(categoryName, expense.notes)
                }
                amount={Number(expense.amount)}
                dateLabel={new Date(expense.created_at).toLocaleDateString("es-CO")}
                ownerPrepaid={Boolean(expense.owner_prepaid)}
                expenseScope={scope}
                tripId={expense.trip_id}
                subtitle={`${driver?.full_name ?? "Conductor"} · ${scopeLabel}${statusSuffix}${
                  expense.notes && scope !== "additional" ? ` · ${expense.notes}` : ""
                }`}
                hasEvidence={expense.hasEvidence}
                onEdit={isSettled ? undefined : () => setEditingId(expense.id)}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

function OwnerEditExpenseForm({
  organizationId,
  expense,
  categories,
  onCancel,
  onSaved,
}: {
  organizationId: string;
  expense: OwnerManageExpense;
  categories: Category[];
  onCancel: () => void;
  onSaved: () => void;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const isAdditional = Boolean(expense.additional_trip_expense);
  const isTripExpense = Boolean(expense.trip_id);
  const scopedCategories = expense.trip_id
    ? categories.filter((c) => (c.scope ?? "trip") === "trip")
    : categories.filter((c) => c.scope === "vehicle");
  const formCategories = scopedCategories.length > 0 ? scopedCategories : categories;
  const initialCategory = formCategories.find((c) => c.id === expense.category_id);
  const [categoryId, setCategoryId] = useState(expense.category_id ?? "");
  const [ownerPrepaid, setOwnerPrepaid] = useState(Boolean(expense.owner_prepaid));
  const [additionalTrip, setAdditionalTrip] = useState(isAdditional);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);

  const selectedCategory = formCategories.find((c) => c.id === categoryId);
  const showOthersField =
    !additionalTrip &&
    selectedCategory &&
    isOthersCategory(selectedCategory.name);

  const [customDescription, setCustomDescription] = useState(() => {
    if (isAdditional) {
      return getAdditionalExpenseDescription(expense.notes);
    }
    if (initialCategory && isOthersCategory(initialCategory.name)) {
      return (expense.notes ?? "").split(" — ")[0] ?? "";
    }
    return "";
  });

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
      formData.set("expenseId", expense.id);
      formData.set("categoryId", additionalTrip ? "" : String(rawFormData.get("categoryId") ?? ""));
      formData.set("amount", String(rawFormData.get("amount") ?? ""));
      formData.set("notes", String(rawFormData.get("notes") ?? ""));
      formData.set("customDescription", String(rawFormData.get("customDescription") ?? customDescription));
      if (isTripExpense && ownerPrepaid) formData.set("ownerPrepaid", "true");
      if (isTripExpense && additionalTrip) formData.set("additionalTripExpense", "true");

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

      const result = await ownerUpdateExpense(formData);
      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      router.refresh();
      onSaved();
      setLoading(false);
    } catch (err) {
      setCompressing(false);
      setLoading(false);
      setError(err instanceof Error ? err.message : "Error al guardar.");
    }
  }

  async function handleDelete() {
    if (!confirm("¿Eliminar este gasto? Esta acción no se puede deshacer.")) {
      return;
    }
    setDeleting(true);
    setError(null);
    const result = await ownerDeleteExpense(expense.id, organizationId);
    if (!result.success) {
      setError(result.error);
      setDeleting(false);
      return;
    }
    router.refresh();
    onSaved();
    setDeleting(false);
  }

  const busy = loading || compressing || deleting;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="space-y-3 rounded-xl border border-brand/20 bg-card p-4 shadow-sm"
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

      {isTripExpense ? (
        <div className="flex flex-wrap gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={ownerPrepaid}
              onChange={(e) => setOwnerPrepaid(e.target.checked)}
            />
            Anticipado (empresa pagó directo)
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={additionalTrip}
              onChange={(e) => setAdditionalTrip(e.target.checked)}
            />
            Gasto adicional (no afecta sueldo)
          </label>
        </div>
      ) : null}

      {!additionalTrip ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Categoría</label>
          <select
            name="categoryId"
            required
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          >
            {formCategories.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
        </div>
      ) : (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Descripción del gasto adicional *</label>
          <input
            name="customDescription"
            required
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      )}

      {showOthersField ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">¿De qué es el gasto? *</label>
          <input
            name="customDescription"
            required
            value={customDescription}
            onChange={(e) => setCustomDescription(e.target.value)}
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label className="text-sm font-medium">Valor</label>
        <CurrencyInput
          name="amount"
          defaultValue={expense.amount}
          required
          className="w-full rounded-md border px-3 py-2 text-sm font-semibold"
        />
      </div>

      {!additionalTrip ? (
        <div className="space-y-1.5">
          <label className="text-sm font-medium">Notas</label>
          <textarea
            name="notes"
            rows={2}
            defaultValue={
              initialCategory && isOthersCategory(initialCategory.name)
                ? (expense.notes ?? "").split(" — ").slice(1).join(" — ")
                : (expense.notes ?? "")
            }
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </div>
      ) : null}

      <div className="space-y-2">
        <label className="text-sm font-medium">Nueva evidencia (opcional)</label>
        <label className="flex min-h-[4rem] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-brand/30 bg-brand/5 px-4 py-3">
          <Camera className="mb-1 h-5 w-5 text-brand" />
          <span className="text-xs font-medium text-brand">Cambiar comprobante</span>
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

      <div className="flex flex-wrap gap-2">
        <Button type="submit" disabled={busy} size="sm">
          {busy ? "Guardando..." : "Guardar cambios"}
        </Button>
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={busy}
          onClick={handleDelete}
          className="text-red-600 hover:text-red-700"
        >
          <Trash2 className="mr-1 h-3.5 w-3.5" />
          Eliminar
        </Button>
      </div>
    </form>
  );
}
