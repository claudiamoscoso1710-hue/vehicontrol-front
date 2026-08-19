"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { createOrganization } from "@/lib/actions/organizations";

export function CreateOrganizationForm() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await createOrganization(new FormData(e.currentTarget));

    if (!result.success) {
      setError(result.error);
      setLoading(false);
      return;
    }

    e.currentTarget.reset();
    router.refresh();
    setLoading(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 rounded-lg border p-4">
      <h2 className="font-medium">Nueva organización</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <input
          name="name"
          placeholder="Nombre de la flota *"
          required
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="ownerEmail"
          type="email"
          placeholder="Email del propietario (opcional)"
          className="rounded-md border px-3 py-2 text-sm"
        />
        <input
          name="ownerPassword"
          type="text"
          placeholder="Contraseña del propietario (si es nuevo)"
          className="rounded-md border px-3 py-2 text-sm sm:col-span-2"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" disabled={loading}>
        {loading ? "Creando..." : "Crear organización"}
      </Button>
    </form>
  );
}
