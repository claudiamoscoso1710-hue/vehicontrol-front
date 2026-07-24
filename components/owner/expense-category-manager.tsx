"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createExpenseCategory, deleteExpenseCategory } from "@/lib/actions/expense-categories";

type Category = {
  id: string;
  name: string;
  requires_evidence: boolean;
};

type Props = {
  organizationId: string;
  categories: Category[];
  canManage: boolean;
};

export function ExpenseCategoryManager({
  organizationId,
  categories,
  canManage,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function handleCreate(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createExpenseCategory(
      organizationId,
      new FormData(e.currentTarget)
    );

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

  return (
    <div className="space-y-4">
      {canManage && (
        <form onSubmit={handleCreate} className="flex flex-wrap items-end gap-3">
          <input
            name="name"
            placeholder="Nueva categoría"
            required
            className="rounded-md border px-3 py-2 text-sm"
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
            className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
          >
            <span>
              {cat.name}
              {cat.requires_evidence && (
                <span className="ml-2 text-xs text-muted-foreground">
                  (evidencia obligatoria)
                </span>
              )}
            </span>
            {canManage && (
              <button
                type="button"
                onClick={() => handleDelete(cat.id)}
                disabled={deletingId === cat.id}
                className="text-xs text-red-600 hover:underline disabled:opacity-50"
              >
                {deletingId === cat.id ? "..." : "Eliminar"}
              </button>
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
