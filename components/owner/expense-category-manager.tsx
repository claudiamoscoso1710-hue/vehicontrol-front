"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  createExpenseCategory,
  deleteExpenseCategory,
  updateExpenseCategory,
  type ExpenseCategoryRow,
} from "@/lib/actions/expense-categories";
import type { ExpenseCategoryScope } from "@/lib/expenses/expense-scope";
import { EXPENSE_SCOPE_META } from "@/lib/expenses/expense-scope";

type Props = {
  organizationId: string;
  categories: ExpenseCategoryRow[];
  scope: ExpenseCategoryScope;
  canManage: boolean;
};

export function ExpenseCategoryManager({
  organizationId,
  categories,
  scope,
  canManage,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);

  const scopeMeta = EXPENSE_SCOPE_META[scope];

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const formData = new FormData(e.currentTarget);
    formData.set("scope", scope);

    const result = await createExpenseCategory(organizationId, formData);

    if (!result.success) {
      setError(result.error);
    } else {
      e.currentTarget.reset();
      router.refresh();
    }
    setLoading(false);
  }

  async function handleDelete(categoryId: string) {
    setDeletingId(categoryId);
    setError(null);

    const result = await deleteExpenseCategory(organizationId, categoryId);

    if (!result.success) {
      setError(result.error);
    } else {
      router.refresh();
    }
    setDeletingId(null);
  }

  async function handleUpdate(
    categoryId: string,
    form: HTMLFormElement
  ) {
    setSavingId(categoryId);
    setError(null);

    const formData = new FormData(form);
    const result = await updateExpenseCategory(organizationId, categoryId, formData);

    if (!result.success) {
      setError(result.error);
    } else {
      setEditingId(null);
      router.refresh();
    }
    setSavingId(null);
  }

  return (
    <div className="space-y-4 rounded-xl border border-border/60 bg-card p-4">
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <h3 className="font-medium">{scopeMeta.label}</h3>
          <span
            className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${scopeMeta.badgeClass}`}
          >
            {scopeMeta.label}
          </span>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {scope === "trip"
            ? "Peajes, combustible, parqueadero y similares del viaje activo."
            : "SOAT, rodamiento, mantenimiento y otros gastos del carro."}
        </p>
      </div>

      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <input type="hidden" name="scope" value={scope} />
          <input
            name="name"
            placeholder="Nueva categoría"
            required
            className="min-w-[10rem] flex-1 rounded-md border px-3 py-2 text-sm"
          />
          <label className="flex items-center gap-2 text-sm">
            <input name="requiresEvidence" type="checkbox" />
            Requiere evidencia
          </label>
          <Button type="submit" size="sm" disabled={loading}>
            {loading ? "..." : "Agregar"}
          </Button>
        </form>
      )}

      {error && <p className="text-sm text-red-600">{error}</p>}

      <ul className="space-y-2">
        {categories.map((cat) => (
          <li
            key={cat.id}
            className="rounded-md border px-3 py-2 text-sm"
          >
            {editingId === cat.id ? (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  void handleUpdate(cat.id, e.currentTarget);
                }}
                className="flex flex-wrap items-end gap-2"
              >
                <input
                  name="name"
                  defaultValue={cat.name}
                  required
                  className="min-w-[8rem] flex-1 rounded-md border px-2 py-1.5 text-sm"
                />
                <label className="flex items-center gap-2 text-xs">
                  <input
                    name="requiresEvidence"
                    type="checkbox"
                    defaultChecked={cat.requires_evidence}
                  />
                  Evidencia
                </label>
                <Button type="submit" size="sm" disabled={savingId === cat.id}>
                  {savingId === cat.id ? "..." : "Guardar"}
                </Button>
                <button
                  type="button"
                  onClick={() => setEditingId(null)}
                  className="text-xs text-muted-foreground hover:underline"
                >
                  Cancelar
                </button>
              </form>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <span>
                  {cat.name}
                  {cat.requires_evidence && (
                    <span className="ml-2 text-xs text-muted-foreground">
                      (evidencia obligatoria)
                    </span>
                  )}
                </span>
                {canManage && (
                  <div className="flex shrink-0 items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditingId(cat.id)}
                      className="text-xs text-brand hover:underline"
                    >
                      Editar
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      className="text-xs text-red-600 hover:underline disabled:opacity-50"
                    >
                      {deletingId === cat.id ? "..." : "Eliminar"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </li>
        ))}
        {categories.length === 0 && (
          <li className="text-sm text-muted-foreground">Sin categorías.</li>
        )}
      </ul>
    </div>
  );
}
