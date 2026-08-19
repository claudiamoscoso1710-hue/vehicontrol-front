"use client";

import { startTransition, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Car,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Mail,
  Trash2,
  UserPlus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  assignDriverToVehicle,
  createDriver,
  removeDriver,
  setDriverStatus,
  updateDriverEmail,
  updateDriverPassword,
  updateDriverProfile,
} from "@/lib/actions/drivers";
import { updateDriverCommission } from "@/lib/actions/driver-compensation";
import type {
  DriverTeamMember,
  VehicleTeamOption,
} from "@/lib/reports/load-driver-team";

type Props = {
  organizationId: string;
  drivers: DriverTeamMember[];
  vehicles: VehicleTeamOption[];
};

export function DriverTeamManager({
  organizationId,
  drivers,
  vehicles,
}: Props) {
  const router = useRouter();
  const [showCreate, setShowCreate] = useState(drivers.length === 0);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [visiblePasswords, setVisiblePasswords] = useState<
    Record<string, boolean>
  >({});

  const activeDrivers = useMemo(
    () => drivers.filter((driver) => driver.status === "active"),
    [drivers]
  );
  const inactiveDrivers = useMemo(
    () => drivers.filter((driver) => driver.status !== "active"),
    [drivers]
  );

  async function runAction(
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) {
    setBusyKey(key);
    setError(null);
    setSuccess(null);

    try {
      const result = await action();
      if (!result.success) {
        setError(result.error ?? "Ocurrió un error.");
      } else {
        setSuccess(successMessage);
        // Refresca datos sin bloquear la UI ni volver a skeletons de inmediato.
        startTransition(() => router.refresh());
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Error de conexión. Revisa que el backend esté activo."
      );
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
        <p className="font-medium">Regla de asignación</p>
        <p className="mt-1 text-sky-800/90">
          Cada conductor puede tener <strong>un solo vehículo</strong> y cada
          vehículo puede tener <strong>un solo conductor</strong>. Si cambias la
          asignación, el sistema actualiza automáticamente el otro lado.
        </p>
      </div>

      {error && (
        <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {success}
        </p>
      )}

      <section className="rounded-xl border">
        <button
          type="button"
          onClick={() => setShowCreate((value) => !value)}
          className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-muted/40"
        >
          <div className="flex items-center gap-2">
            <UserPlus className="h-4 w-4 text-brand" />
            <div>
              <p className="font-medium">Nuevo conductor</p>
              <p className="text-sm text-muted-foreground">
                Crea la cuenta con email y contraseña para la app del conductor
              </p>
            </div>
          </div>
          {showCreate ? (
            <ChevronUp className="h-4 w-4 shrink-0 text-muted-foreground" />
          ) : (
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          )}
        </button>

        {showCreate && (
          <CreateDriverForm
            organizationId={organizationId}
            vehicles={vehicles}
            busy={busyKey === "create"}
            onSubmit={async (formData) => {
              await runAction(
                "create",
                () => createDriver(organizationId, formData),
                "Conductor creado correctamente."
              );
            }}
          />
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-semibold">Equipo activo</h3>
          <p className="text-sm text-muted-foreground">
            {activeDrivers.length} conductor
            {activeDrivers.length === 1 ? "" : "es"} activo
            {activeDrivers.length === 1 ? "" : "s"}
          </p>
        </div>

        {activeDrivers.length === 0 ? (
          <p className="rounded-lg border border-dashed px-4 py-8 text-center text-sm text-muted-foreground">
            No hay conductores activos. Crea el primero arriba.
          </p>
        ) : (
          <div className="space-y-3">
            {activeDrivers.map((driver) => (
              <DriverCard
                key={driver.id}
                driver={driver}
                organizationId={organizationId}
                vehicles={vehicles}
                expanded={expandedId === driver.id}
                onToggle={() =>
                  setExpandedId((current) =>
                    current === driver.id ? null : driver.id
                  )
                }
                busyKey={busyKey}
                visiblePassword={Boolean(visiblePasswords[driver.id])}
                onTogglePassword={() =>
                  setVisiblePasswords((prev) => ({
                    ...prev,
                    [driver.id]: !prev[driver.id],
                  }))
                }
                onAction={runAction}
              />
            ))}
          </div>
        )}
      </section>

      {inactiveDrivers.length > 0 && (
        <section className="space-y-3">
          <div>
            <h3 className="font-semibold text-muted-foreground">Eliminados</h3>
            <p className="text-sm text-muted-foreground">
              Conductores dados de baja. Puedes reactivarlos si lo necesitas.
            </p>
          </div>
          <div className="space-y-2">
            {inactiveDrivers.map((driver) => (
              <div
                key={driver.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm"
              >
                <div>
                  <p className="font-medium">{driver.full_name}</p>
                  <p className="text-muted-foreground">
                    {driver.email ?? "Sin email"} ·{" "}
                    {driver.phone ?? "Sin teléfono"}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={busyKey === `reactivate-${driver.id}`}
                  onClick={() =>
                    runAction(
                      `reactivate-${driver.id}`,
                      () =>
                        setDriverStatus(organizationId, driver.id, "active"),
                      "Conductor reactivado."
                    )
                  }
                >
                  Reactivar
                </Button>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function CreateDriverForm({
  organizationId,
  vehicles,
  busy,
  onSubmit,
}: {
  organizationId: string;
  vehicles: VehicleTeamOption[];
  busy: boolean;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const availableVehicles = vehicles.filter((v) => !v.assigned_driver_id);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    await onSubmit(new FormData(e.currentTarget));
    e.currentTarget.reset();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-4 border-t px-4 pb-4 pt-2"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Nombre completo *">
          <input
            name="fullName"
            required
            placeholder="Ej. Juan Pérez"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Teléfono">
          <input
            name="phone"
            placeholder="300 123 4567"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Email de acceso *">
          <input
            name="email"
            type="email"
            required
            placeholder="conductor@empresa.com"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Contraseña *">
          <input
            name="password"
            type="password"
            required
            minLength={8}
            placeholder="Mínimo 8 caracteres"
            className="w-full rounded-md border px-3 py-2 text-sm"
          />
        </Field>
        <Field label="Vehículo (opcional)" className="sm:col-span-2">
          <select name="vehicleId" className="w-full rounded-md border px-3 py-2 text-sm" defaultValue="">
            <option value="">Sin asignar por ahora</option>
            {availableVehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
              </option>
            ))}
          </select>
          {availableVehicles.length === 0 && vehicles.length > 0 && (
            <p className="mt-1 text-xs text-amber-700">
              Todos los vehículos activos ya tienen conductor. Puedes crear el
              conductor y reasignar después.
            </p>
          )}
        </Field>
      </div>
      <Button type="submit" disabled={busy}>
        {busy ? "Creando..." : "Crear conductor con acceso"}
      </Button>
    </form>
  );
}

function DriverCard({
  driver,
  organizationId,
  vehicles,
  expanded,
  onToggle,
  busyKey,
  visiblePassword,
  onTogglePassword,
  onAction,
}: {
  driver: DriverTeamMember;
  organizationId: string;
  vehicles: VehicleTeamOption[];
  expanded: boolean;
  onToggle: () => void;
  busyKey: string | null;
  visiblePassword: boolean;
  onTogglePassword: () => void;
  onAction: (
    key: string,
    action: () => Promise<{ success: boolean; error?: string }>,
    successMessage: string
  ) => Promise<void>;
}) {
  const [emailDraft, setEmailDraft] = useState(driver.email ?? "");
  const [passwordDraft, setPasswordDraft] = useState("");
  const [nameDraft, setNameDraft] = useState(driver.full_name);
  const [phoneDraft, setPhoneDraft] = useState(driver.phone ?? "");
  const [vehicleDraft, setVehicleDraft] = useState(
    driver.assignedVehicle?.id ?? ""
  );
  const [confirmDelete, setConfirmDelete] = useState(false);

  const vehicleOptions = vehicles.map((vehicle) => {
    const takenByOther =
      vehicle.assigned_driver_id &&
      vehicle.assigned_driver_id !== driver.id;
    return {
      ...vehicle,
      label: takenByOther
        ? `${vehicle.plate} → reasignará desde ${vehicle.assigned_driver_name}`
        : vehicle.plate,
    };
  });

  return (
    <article className="rounded-xl border bg-card shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex flex-wrap items-center gap-2">
            <h4 className="font-semibold">{driver.full_name}</h4>
            <StatusBadge status={driver.status} />
          </div>
          <p className="text-sm text-muted-foreground">
            {driver.phone ?? "Sin teléfono"}
          </p>
          <div className="flex items-start gap-2 pt-1 text-sm">
            <Mail className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="min-w-0">
              <p className="text-xs font-medium text-muted-foreground">
                Correo de acceso
              </p>
              <p className="break-all font-medium">
                {driver.email ?? "Sin cuenta vinculada"}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 pt-1 text-sm">
            <Car className="h-4 w-4 text-muted-foreground" />
            {driver.assignedVehicle ? (
              <span>
                Vehículo{" "}
                <strong className="font-medium">
                  {driver.assignedVehicle.plate}
                </strong>
              </span>
            ) : (
              <span className="text-muted-foreground">Sin vehículo asignado</span>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/app/drivers/${driver.id}/account`}
            className="text-sm font-medium text-brand hover:underline"
          >
            Estado de cuenta
          </Link>
          <Button type="button" variant="outline" size="sm" onClick={onToggle}>
            {expanded ? "Cerrar" : "Editar"}
          </Button>
        </div>
      </div>

      {expanded && (
        <div className="space-y-5 border-t px-4 py-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Datos personales</p>
              <Field label="Nombre">
                <input
                  value={nameDraft}
                  onChange={(e) => setNameDraft(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </Field>
              <Field label="Teléfono">
                <input
                  value={phoneDraft}
                  onChange={(e) => setPhoneDraft(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                />
              </Field>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyKey === `profile-${driver.id}`}
                onClick={() => {
                  const formData = new FormData();
                  formData.set("fullName", nameDraft);
                  formData.set("phone", phoneDraft);
                  void onAction(
                    `profile-${driver.id}`,
                    () =>
                      updateDriverProfile(organizationId, driver.id, formData),
                    "Datos actualizados."
                  );
                }}
              >
                Guardar datos
              </Button>
            </div>

            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Acceso a la app</p>
              <div className="rounded-md border bg-muted/30 px-3 py-2">
                <p className="text-xs font-medium text-muted-foreground">
                  Correo actual
                </p>
                <p className="mt-0.5 break-all text-sm font-medium">
                  {driver.email ?? "Sin cuenta vinculada"}
                </p>
              </div>
              <Field label="Cambiar email">
                <input
                  type="email"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  className="w-full rounded-md border px-3 py-2 text-sm"
                  disabled={!driver.user_id}
                />
              </Field>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={!driver.user_id || busyKey === `email-${driver.id}`}
                onClick={() =>
                  onAction(
                    `email-${driver.id}`,
                    () =>
                      updateDriverEmail(
                        organizationId,
                        driver.id,
                        emailDraft
                      ),
                    "Email actualizado."
                  )
                }
              >
                Guardar email
              </Button>

              <div className="border-t pt-3">
                <Field label="Contraseña actual">
                  <div className="flex items-center gap-2">
                    <code className="flex-1 rounded-md border bg-muted/40 px-2 py-1.5 text-xs">
                      {driver.password
                        ? visiblePassword
                          ? driver.password
                          : "••••••••"
                        : "No registrada"}
                    </code>
                    {driver.password && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-xs"
                        onClick={onTogglePassword}
                        aria-label={
                          visiblePassword ? "Ocultar contraseña" : "Ver contraseña"
                        }
                      >
                        {visiblePassword ? (
                          <EyeOff className="h-3.5 w-3.5" />
                        ) : (
                          <Eye className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    )}
                  </div>
                </Field>
                <Field label="Nueva contraseña">
                  <input
                    type="password"
                    value={passwordDraft}
                    onChange={(e) => setPasswordDraft(e.target.value)}
                    placeholder="Mínimo 8 caracteres"
                    minLength={8}
                    className="w-full rounded-md border px-3 py-2 text-sm"
                    disabled={!driver.user_id}
                  />
                </Field>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  disabled={
                    !driver.user_id ||
                    !passwordDraft ||
                    busyKey === `password-${driver.id}`
                  }
                  onClick={() =>
                    onAction(
                      `password-${driver.id}`,
                      async () => {
                        const result = await updateDriverPassword(
                          organizationId,
                          driver.id,
                          passwordDraft
                        );
                        if (result.success) setPasswordDraft("");
                        return result;
                      },
                      "Contraseña actualizada."
                    )
                  }
                >
                  Cambiar contraseña
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <div className="space-y-3 rounded-lg border p-3">
              <p className="text-sm font-medium">Vehículo asignado</p>
              <select
                value={vehicleDraft}
                onChange={(e) => setVehicleDraft(e.target.value)}
                className="w-full rounded-md border px-3 py-2 text-sm"
              >
                <option value="">Sin vehículo</option>
                {vehicleOptions.map((vehicle) => (
                  <option key={vehicle.id} value={vehicle.id}>
                    {vehicle.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                size="sm"
                variant="outline"
                disabled={busyKey === `vehicle-${driver.id}`}
                onClick={() =>
                  onAction(
                    `vehicle-${driver.id}`,
                    () =>
                      assignDriverToVehicle(
                        organizationId,
                        driver.id,
                        vehicleDraft || null
                      ),
                    "Vehículo actualizado."
                  )
                }
              >
                Guardar asignación
              </Button>
            </div>

            <CommissionField
              driver={driver}
              busy={busyKey === `commission-${driver.id}`}
              onSave={(formData) =>
                onAction(
                  `commission-${driver.id}`,
                  () =>
                    updateDriverCommission(
                      organizationId,
                      driver.id,
                      formData
                    ),
                  "Comisión actualizada."
                )
              }
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t pt-4">
            {!confirmDelete ? (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Eliminar conductor
              </Button>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-destructive">
                  ¿Eliminar a {driver.full_name}? Se quitará el acceso y la
                  asignación de vehículo.
                </p>
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  disabled={busyKey === `remove-${driver.id}`}
                  onClick={() =>
                    onAction(
                      `remove-${driver.id}`,
                      () => removeDriver(organizationId, driver.id),
                      "Conductor eliminado."
                    )
                  }
                >
                  Confirmar
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmDelete(false)}
                >
                  Cancelar
                </Button>
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

function CommissionField({
  driver,
  busy,
  onSave,
}: {
  driver: DriverTeamMember;
  busy: boolean;
  onSave: (formData: FormData) => Promise<void>;
}) {
  const [commission, setCommission] = useState(
    driver.commission_percent?.toString() ?? ""
  );

  return (
    <div className="space-y-3 rounded-lg border p-3">
      <p className="text-sm font-medium">Comisión personal</p>
      <Field label="Porcentaje (%)">
        <input
          type="number"
          min={0}
          max={100}
          step={0.5}
          value={commission}
          onChange={(e) => setCommission(e.target.value)}
          placeholder="Usar % de la empresa"
          className="w-full rounded-md border px-3 py-2 text-sm"
        />
      </Field>
      <Button
        type="button"
        size="sm"
        variant="outline"
        disabled={busy}
        onClick={() => {
          const formData = new FormData();
          formData.set("commissionPercent", commission);
          void onSave(formData);
        }}
      >
        Guardar comisión
      </Button>
    </div>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1 block text-xs font-medium text-muted-foreground">
        {label}
      </span>
      {children}
    </label>
  );
}
