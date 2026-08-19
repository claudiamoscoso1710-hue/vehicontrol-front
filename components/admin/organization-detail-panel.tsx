"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/format";
import { formatBillingBreakdown } from "@/lib/reports/org-vehicle-billing";
import {
  removeOrganizationOwner,
  resetOrganizationOwnerPassword,
  setOrganizationOwner,
  updateOrganizationName,
  updateOrganizationOwnerEmail,
} from "@/lib/actions/organizations";

type Owner = {
  userId: string;
  email: string;
  fullName: string | null;
  password: string | null;
};

type Props = {
  organizationId: string;
  initialName: string;
  owners: Owner[];
  pricePerVehicle: number;
  activeVehicleCount: number;
};

export function OrganizationDetailPanel({
  organizationId,
  initialName,
  owners,
  pricePerVehicle,
  activeVehicleCount,
}: Props) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [ownerEmail, setOwnerEmail] = useState("");
  const [ownerPassword, setOwnerPassword] = useState("");
  const [emailDrafts, setEmailDrafts] = useState<Record<string, string>>(() =>
    Object.fromEntries(owners.map((owner) => [owner.userId, owner.email]))
  );
  const [passwordDrafts, setPasswordDrafts] = useState<Record<string, string>>({});
  const [visiblePasswords, setVisiblePasswords] = useState<Record<string, boolean>>(
    {}
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleRename(e: React.FormEvent) {
    e.preventDefault();
    setLoading("rename");
    setError(null);
    setSuccess(null);

    const result = await updateOrganizationName(organizationId, name);

    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess("Nombre actualizado.");
      router.refresh();
    }
    setLoading(null);
  }

  async function handleAddOwner(e: React.FormEvent) {
    e.preventDefault();
    setLoading("add-owner");
    setError(null);
    setSuccess(null);

    const result = await setOrganizationOwner(
      organizationId,
      ownerEmail,
      ownerPassword || undefined
    );

    if (!result.success) {
      setError(result.error);
    } else {
      setOwnerEmail("");
      setOwnerPassword("");
      setSuccess("Propietario asignado.");
      router.refresh();
    }
    setLoading(null);
  }

  async function handleRemoveOwner(userId: string) {
    setLoading(`remove-${userId}`);
    setError(null);
    setSuccess(null);

    const result = await removeOrganizationOwner(organizationId, userId);

    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess("Propietario removido.");
      router.refresh();
    }
    setLoading(null);
  }

  async function handleResetPassword(userId: string) {
    const newPassword = passwordDrafts[userId]?.trim() ?? "";
    if (!newPassword) {
      setError("Escribe la nueva contraseña.");
      return;
    }

    setLoading(`password-${userId}`);
    setError(null);
    setSuccess(null);

    const result = await resetOrganizationOwnerPassword(
      organizationId,
      userId,
      newPassword
    );

    if (!result.success) {
      setError(result.error);
    } else {
      setPasswordDrafts((prev) => ({ ...prev, [userId]: "" }));
      setSuccess("Contraseña actualizada.");
      router.refresh();
    }
    setLoading(null);
  }

  async function handleUpdateEmail(userId: string) {
    const newEmail = emailDrafts[userId]?.trim() ?? "";
    if (!newEmail) {
      setError("Escribe el nuevo email.");
      return;
    }

    setLoading(`email-${userId}`);
    setError(null);
    setSuccess(null);

    const result = await updateOrganizationOwnerEmail(
      organizationId,
      userId,
      newEmail
    );

    if (!result.success) {
      setError(result.error);
    } else {
      setSuccess("Email actualizado.");
      router.refresh();
    }
    setLoading(null);
  }

  function togglePasswordVisibility(userId: string) {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  }

  return (
    <div className="mt-4 space-y-4 border-t pt-4">
      {error && <p className="text-xs text-red-600">{error}</p>}
      {success && <p className="text-xs text-green-700">{success}</p>}

      <form onSubmit={handleRename} className="flex flex-wrap items-end gap-2">
        <div className="min-w-[200px] flex-1">
          <label className="mb-1 block text-xs text-muted-foreground">
            Nombre de la flota
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full rounded-md border px-3 py-1.5 text-sm"
          />
        </div>
        <Button type="submit" size="sm" disabled={loading === "rename"}>
          {loading === "rename" ? "Guardando..." : "Guardar nombre"}
        </Button>
      </form>

      <div className="rounded-md border bg-muted/10 p-3 text-xs">
        <p className="font-medium text-muted-foreground">Facturación mensual</p>
        <p className="mt-1">
          {formatBillingBreakdown(activeVehicleCount, pricePerVehicle, formatCurrency)}
        </p>
      </div>

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">
          Propietarios
        </p>
        {owners.length === 0 ? (
          <p className="text-xs text-muted-foreground">Sin propietario asignado.</p>
        ) : (
          <ul className="space-y-3">
            {owners.map((owner) => (
              <li
                key={owner.userId}
                className="rounded-md border bg-muted/20 p-3 text-xs"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{owner.fullName ?? "Propietario"}</span>
                  <button
                    type="button"
                    disabled={!!loading}
                    onClick={() => handleRemoveOwner(owner.userId)}
                    className="text-red-600 hover:underline disabled:opacity-50"
                  >
                    {loading === `remove-${owner.userId}` ? "..." : "Quitar"}
                  </button>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-muted-foreground">Email de acceso</p>
                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="email"
                      value={emailDrafts[owner.userId] ?? owner.email}
                      onChange={(e) =>
                        setEmailDrafts((prev) => ({
                          ...prev,
                          [owner.userId]: e.target.value,
                        }))
                      }
                      className="min-w-[220px] flex-1 rounded-md border px-3 py-1.5 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading === `email-${owner.userId}`}
                      onClick={() => handleUpdateEmail(owner.userId)}
                    >
                      {loading === `email-${owner.userId}`
                        ? "Guardando..."
                        : "Guardar email"}
                    </Button>
                  </div>
                </div>

                <div className="mt-2 space-y-2">
                  <p className="text-muted-foreground">Contraseña de acceso</p>
                  {owner.password ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <code className="rounded bg-background px-2 py-1 font-mono text-xs">
                        {visiblePasswords[owner.userId]
                          ? owner.password
                          : "••••••••••••"}
                      </code>
                      <button
                        type="button"
                        onClick={() => togglePasswordVisibility(owner.userId)}
                        className="text-brand hover:underline"
                      >
                        {visiblePasswords[owner.userId] ? "Ocultar" : "Ver"}
                      </button>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">
                      Sin contraseña registrada. Establece una nueva abajo.
                    </p>
                  )}

                  <div className="flex flex-wrap items-end gap-2">
                    <input
                      type="text"
                      value={passwordDrafts[owner.userId] ?? ""}
                      onChange={(e) =>
                        setPasswordDrafts((prev) => ({
                          ...prev,
                          [owner.userId]: e.target.value,
                        }))
                      }
                      placeholder="Nueva contraseña (mín. 8)"
                      className="min-w-[180px] flex-1 rounded-md border px-3 py-1.5 text-sm"
                    />
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={loading === `password-${owner.userId}`}
                      onClick={() => handleResetPassword(owner.userId)}
                    >
                      {loading === `password-${owner.userId}`
                        ? "Guardando..."
                        : "Cambiar contraseña"}
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <form onSubmit={handleAddOwner} className="space-y-2">
        <p className="text-xs font-medium text-muted-foreground">
          Agregar propietario
        </p>
        <div className="flex flex-wrap items-end gap-2">
          <input
            type="email"
            value={ownerEmail}
            onChange={(e) => setOwnerEmail(e.target.value)}
            placeholder="Email del propietario *"
            required
            className="min-w-[200px] flex-1 rounded-md border px-3 py-1.5 text-sm"
          />
          <input
            type="text"
            value={ownerPassword}
            onChange={(e) => setOwnerPassword(e.target.value)}
            placeholder="Contraseña (si es usuario nuevo)"
            className="min-w-[200px] flex-1 rounded-md border px-3 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" disabled={loading === "add-owner"}>
            {loading === "add-owner" ? "Asignando..." : "Asignar"}
          </Button>
        </div>
      </form>
    </div>
  );
}
