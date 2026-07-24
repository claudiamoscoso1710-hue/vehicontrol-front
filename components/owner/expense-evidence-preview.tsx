"use client";

import { useEffect, useState } from "react";

type Props = {
  expenseId: string;
};

export function ExpenseEvidencePreview({ expenseId }: Props) {
  const [url, setUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      const res = await fetch(`/api/evidences/${expenseId}`);
      const data = await res.json();

      if (cancelled) return;

      if (!res.ok) {
        setError(data.error ?? "No se pudo cargar la evidencia");
        setLoading(false);
        return;
      }

      setUrl(data.url);
      setLoading(false);
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [expenseId]);

  if (loading) {
    return <p className="text-xs text-muted-foreground">Cargando evidencia…</p>;
  }

  if (error) {
    return <p className="text-xs text-red-600">{error}</p>;
  }

  if (!url) return null;

  const isPdf = url.toLowerCase().includes(".pdf");

  if (isPdf) {
    return (
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-xs text-blue-600 hover:underline"
      >
        Ver comprobante PDF
      </a>
    );
  }

  return (
    <a href={url} target="_blank" rel="noopener noreferrer" className="mt-2 block">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={url}
        alt="Evidencia del gasto"
        className="max-h-40 rounded-md border object-cover"
      />
    </a>
  );
}
