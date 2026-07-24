"use client";

import { useState } from "react";
import { Eye, ExternalLink, Loader2, Pencil, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  expenseId: string;
  categoryName: string;
  amount: number;
  dateLabel: string;
  subtitle?: string | null;
  hasEvidence?: boolean;
  onEdit?: () => void;
  className?: string;
};

export function DriverExpenseRow({
  expenseId,
  categoryName,
  amount,
  dateLabel,
  subtitle,
  hasEvidence = false,
  onEdit,
  className,
}: Props) {
  const [evidenceOpen, setEvidenceOpen] = useState(false);
  const [url, setUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function toggleEvidence() {
    if (evidenceOpen) {
      setEvidenceOpen(false);
      return;
    }

    setEvidenceOpen(true);

    if (url) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/evidences/${expenseId}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar el comprobante");
        return;
      }

      setUrl(data.url);
    } catch {
      setError("Error al cargar el comprobante");
    } finally {
      setLoading(false);
    }
  }

  const isPdf = url?.toLowerCase().includes(".pdf") ?? false;

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border border-border/50 bg-background",
        className
      )}
    >
      <div className="flex items-center gap-3 p-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{categoryName}</p>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {subtitle}
            </p>
          ) : null}
          <p className="mt-0.5 text-xs text-muted-foreground">{dateLabel}</p>
        </div>

        <p className="shrink-0 text-sm font-bold tabular-nums text-blue-700">
          +{formatCurrency(amount)}
        </p>

        {hasEvidence ? (
          <button
            type="button"
            onClick={toggleEvidence}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand transition-colors hover:bg-brand/10 active:scale-95"
            aria-label={evidenceOpen ? "Ocultar comprobante" : "Ver comprobante"}
          >
            {evidenceOpen ? (
              <X className="h-4 w-4" />
            ) : (
              <Eye className="h-4 w-4" />
            )}
          </button>
        ) : null}

        {onEdit ? (
          <button
            type="button"
            onClick={onEdit}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-brand hover:bg-brand/10 active:scale-95"
            aria-label="Editar gasto"
          >
            <Pencil className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {evidenceOpen ? (
        <div className="border-t border-border/50 bg-muted/20 px-3 py-3">
          {loading ? (
            <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando comprobante…
            </div>
          ) : null}

          {error ? (
            <p className="py-2 text-center text-xs text-red-600">{error}</p>
          ) : null}

          {url && isPdf ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-1.5 py-4 text-sm font-medium text-brand hover:underline"
            >
              <ExternalLink className="h-4 w-4" />
              Abrir comprobante PDF
            </a>
          ) : null}

          {url && !isPdf ? (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={url}
                alt="Comprobante del gasto"
                className="mx-auto max-h-64 w-full rounded-lg border bg-white object-contain"
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Toca la imagen para abrirla en tamaño completo
              </p>
            </a>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
