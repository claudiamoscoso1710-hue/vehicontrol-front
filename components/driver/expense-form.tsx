"use client";

import { useRef, useState } from "react";
import {
  Camera,
  CheckCircle2,
  ImagePlus,
  Images,
  Loader2,
  Send,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CurrencyInput } from "@/components/ui/currency-input";
import { postBackendForm } from "@/lib/api/client-backend";
import {
  compressImageFile,
  formatFileSize,
} from "@/lib/client/compress-image";
import { isOthersCategory } from "@/lib/expenses/category-utils";
import {
  driverFieldClassName,
  driverTextareaClassName,
} from "@/components/driver/driver-ui";

type Category = { id: string; name: string };

type AssignedVehicle = {
  plate: string;
  brand?: string | null;
};

type Props = {
  organizationId: string;
  categories: Category[];
  tripId?: string;
  vehicleMode?: boolean;
  assignedVehicle?: AssignedVehicle | null;
  submitLabel?: string;
  compact?: boolean;
  onSuccess?: () => void;
};

export function DriverExpenseForm({
  organizationId,
  categories,
  tripId,
  vehicleMode = false,
  assignedVehicle = null,
  submitLabel,
  compact = false,
  onSuccess,
}: Props) {
  const isVehicleMode = vehicleMode && !tripId;
  const formRef = useRef<HTMLFormElement>(null);
  const evidenceInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [fileInfo, setFileInfo] = useState<string | null>(null);
  const [previewName, setPreviewName] = useState<string | null>(null);
  const [amountKey, setAmountKey] = useState(0);
  const [categoryId, setCategoryId] = useState("");

  const selectedCategory = categories.find((c) => c.id === categoryId);
  const showOthersField = selectedCategory
    ? isOthersCategory(selectedCategory.name)
    : false;

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = formRef.current;
    if (!form) return;

    setLoading(true);
    setError(null);
    setSuccess(false);

    const rawFormData = new FormData(form);
    const evidence = rawFormData.get("evidence");
    const hasEvidence = evidence instanceof File && evidence.size > 0;

    try {
      const formData = new FormData();
      formData.set("organizationId", organizationId);
      formData.set("categoryId", String(rawFormData.get("categoryId") ?? ""));
      formData.set("amount", String(rawFormData.get("amount") ?? ""));
      formData.set("notes", String(rawFormData.get("notes") ?? ""));
      formData.set(
        "customDescription",
        String(rawFormData.get("customDescription") ?? "")
      );

      if (hasEvidence) {
        setCompressing(true);
        const compressed = await compressImageFile(evidence);
        setCompressing(false);

        if (compressed.wasCompressed) {
          setFileInfo(
            `Comprimida: ${formatFileSize(compressed.originalSize)} → ${formatFileSize(compressed.compressedSize)}`
          );
        }

        formData.set("evidence", compressed.file, compressed.file.name);
      }

      if (tripId) {
        formData.set("tripId", tripId);
      }

      const result = isVehicleMode
        ? await postBackendForm("/api/actions/expenses/submit-vehicle", formData)
        : await postBackendForm("/api/actions/expenses/submit-driver", formData);

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setFileInfo(null);
      setPreviewName(null);
      setCategoryId("");
      form.reset();
      setAmountKey((k) => k + 1);
      setLoading(false);
      onSuccess?.();
    } catch (err) {
      setCompressing(false);
      setLoading(false);
      setError(
        err instanceof Error ? err.message : "Error al procesar la imagen."
      );
    }
  }

  const busy = loading || compressing;

  function handleEvidenceChange(file: File | undefined) {
    setPreviewName(file?.name ?? null);
    setFileInfo(file ? formatFileSize(file.size) : null);
    setSuccess(false);
  }

  function openCameraCapture() {
    const input = evidenceInputRef.current;
    if (!input) return;

    input.value = "";
    input.accept = "image/*";
    input.setAttribute("capture", "environment");
    input.click();
  }

  function openGalleryPicker() {
    const input = evidenceInputRef.current;
    if (!input) return;

    input.value = "";
    input.removeAttribute("capture");
    input.accept =
      "image/jpeg,image/png,image/webp,image/heic,image/heif,application/pdf";
    input.click();
  }

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className={compact ? "space-y-3" : "space-y-4"}
    >
      {isVehicleMode && assignedVehicle ? (
        <div className="rounded-2xl border border-brand/20 bg-brand/5 px-4 py-3 text-sm">
          <p className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
            Vehículo asignado
          </p>
          <p className="font-semibold">{assignedVehicle.plate}</p>
          {assignedVehicle.brand ? (
            <p className="text-xs text-muted-foreground">{assignedVehicle.brand}</p>
          ) : null}
        </div>
      ) : null}

      {isVehicleMode && !assignedVehicle ? (
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          No tienes un vehículo asignado. Pide a tu empresa que te asigne uno.
        </div>
      ) : null}

      <div className="space-y-1.5">
        <label htmlFor="categoryId" className="text-sm font-semibold">
          {isVehicleMode ? "Tipo de gasto" : "Categoría"}
        </label>
        <select
          id="categoryId"
          name="categoryId"
          required
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={driverFieldClassName()}
        >
          <option value="">
            {isVehicleMode ? "SOAT, rodamiento, etc." : "¿En qué gastaste?"}
          </option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      {showOthersField && (
        <div className="space-y-1.5">
          <label htmlFor="customDescription" className="text-sm font-semibold">
            ¿De qué es el gasto? *
          </label>
          <input
            id="customDescription"
            name="customDescription"
            required
            placeholder="Ej: Parqueadero, herramienta, casco..."
            className={driverFieldClassName()}
          />
        </div>
      )}

      <div className="space-y-1.5">
        <label htmlFor="amount" className="text-sm font-semibold">
          Valor
        </label>
        <CurrencyInput
          key={`amount-${amountKey}`}
          id="amount"
          name="amount"
          required
          placeholder="85.000"
          className={driverFieldClassName("font-bold")}
        />
      </div>

      <div className="space-y-1.5">
        <label htmlFor="notes" className="text-sm font-semibold">
          Notas{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </label>
        <textarea
          id="notes"
          name="notes"
          rows={2}
          placeholder={
            isVehicleMode
              ? "Ej: Vencimiento SOAT marzo 2026"
              : "Ej: Peaje autopista norte"
          }
          className={driverTextareaClassName()}
        />
      </div>

      <div className="space-y-2">
        <p className="text-sm font-semibold">
          Comprobante{" "}
          <span className="font-normal text-muted-foreground">(opcional)</span>
        </p>

        {previewName ? (
          <div className="rounded-2xl border border-brand/25 bg-brand/5 px-4 py-4">
            <div className="flex items-start gap-3">
              <ImagePlus className="mt-0.5 h-8 w-8 shrink-0 text-brand" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-brand">
                  {previewName}
                </p>
                {fileInfo ? (
                  <p className="mt-1 text-xs text-muted-foreground">{fileInfo}</p>
                ) : null}
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl text-sm font-semibold"
                onClick={openCameraCapture}
              >
                <Camera className="mr-2 h-4 w-4" />
                Otra foto
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-12 rounded-xl text-sm font-semibold"
                onClick={openGalleryPicker}
              >
                <Images className="mr-2 h-4 w-4" />
                Cambiar
              </Button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={openCameraCapture}
              className="flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl border-2 border-dashed border-brand/35 bg-brand/5 px-4 py-5 transition-all active:scale-[0.99] hover:border-brand/55 hover:bg-brand/10"
            >
              <Camera className="mb-2 h-9 w-9 text-brand" />
              <span className="text-sm font-semibold text-brand">Tomar foto</span>
              <span className="mt-1 text-center text-xs text-muted-foreground">
                Abre la cámara del celular
              </span>
            </button>
            <button
              type="button"
              onClick={openGalleryPicker}
              className="flex min-h-[7.5rem] flex-col items-center justify-center rounded-2xl border border-border/70 bg-muted/20 px-4 py-5 transition-all active:scale-[0.99] hover:bg-muted/40"
            >
              <Images className="mb-2 h-8 w-8 text-muted-foreground" />
              <span className="text-sm font-semibold">Elegir archivo</span>
              <span className="mt-1 text-center text-xs text-muted-foreground">
                Galería o PDF · máx 5 MB
              </span>
            </button>
          </div>
        )}

        <input
          ref={evidenceInputRef}
          id="evidence"
          name="evidence"
          type="file"
          className="sr-only"
          onChange={(event) => {
            handleEvidenceChange(event.target.files?.[0]);
          }}
        />
      </div>

      {error && (
        <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </p>
      )}
      {success && (
        <div className="flex items-center gap-2 rounded-xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          Gasto reportado correctamente.
        </div>
      )}

      <Button
        type="submit"
        className={
          compact
            ? "h-12 w-full rounded-2xl bg-brand text-base font-bold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand/90 active:scale-[0.98]"
            : "h-14 w-full rounded-2xl bg-brand text-base font-bold text-brand-foreground shadow-lg shadow-brand/20 hover:bg-brand/90 active:scale-[0.98]"
        }
        disabled={busy || (isVehicleMode && !assignedVehicle)}
      >
        {compressing ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Comprimiendo...
          </>
        ) : loading ? (
          "Enviando..."
        ) : (
          <>
            <Send className="mr-2 h-5 w-5" />
            {submitLabel ?? "Enviar gasto"}
          </>
        )}
      </Button>
    </form>
  );
}
