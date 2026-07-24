"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createDriver } from "@/lib/actions/drivers";

type Props = {
  organizationId: string;
};

export function CreateDriverForm({ organizationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    const form = e.currentTarget;
    const result = await createDriver(organizationId, new FormData(form));

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    setSuccess(true);
    form.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Nuevo conductor</h2>

      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="fullName"
          placeholder="Nombre completo *"
          required
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="phone"
          placeholder="Teléfono"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}
      {success && (
        <p className="text-sm text-green-700">Conductor creado correctamente.</p>
      )}

      <Button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear conductor"}
      </Button>
    </form>
  );
}
