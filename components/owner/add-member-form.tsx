"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { addOrganizationMember } from "@/lib/actions/members";

type Props = {
  organizationId: string;
};

export function AddMemberForm({ organizationId }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const result = await addOrganizationMember(
      organizationId,
      new FormData(e.currentTarget)
    );

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
    <form onSubmit={handleSubmit} className="space-y-3 rounded-lg border p-4">
      <h3 className="font-medium">Agregar miembro</h3>
      <p className="text-xs text-muted-foreground">
        El usuario debe existir en la plataforma (haber iniciado sesión al menos una vez).
      </p>
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          name="email"
          type="email"
          placeholder="Email *"
          required
          className="rounded-md border px-3 py-2 text-sm"
        />
        <select
          name="role"
          required
          className="rounded-md border px-3 py-2 text-sm"
          defaultValue="admin"
        >
          <option value="admin">Administrador</option>
          <option value="accountant">Contador</option>
          <option value="driver">Conductor</option>
        </select>
        <input
          name="driverName"
          placeholder="Nombre (si es conductor)"
          className="rounded-md border px-3 py-2 text-sm"
        />
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
      <Button type="submit" size="sm" disabled={loading}>
        {loading ? "Agregando..." : "Agregar"}
      </Button>
    </form>
  );
}
