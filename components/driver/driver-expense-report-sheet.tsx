"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PlusCircle, Receipt, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DriverExpenseForm } from "@/components/driver/expense-form";
import { cn } from "@/lib/utils";

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
  additionalMode?: boolean;
  assignedVehicle?: AssignedVehicle | null;
  submitLabel?: string;
  buttonLabel?: string;
  sheetTitle?: string;
  buttonHint?: string;
  disabled?: boolean;
};

export function DriverExpenseReportSheet({
  organizationId,
  categories,
  tripId,
  vehicleMode = false,
  additionalMode = false,
  assignedVehicle = null,
  submitLabel,
  buttonLabel = "Reportar gasto",
  sheetTitle = "Reportar gasto",
  buttonHint,
  disabled = false,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  function handleSuccess() {
    router.refresh();
    window.setTimeout(() => setOpen(false), 1200);
  }

  const Icon = additionalMode ? PlusCircle : Receipt;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={disabled}
        className={cn(
          "flex w-full items-center gap-3 rounded-2xl border px-4 py-4 text-left shadow-sm transition-all active:scale-[0.99]",
          additionalMode
            ? "border-violet-300/60 bg-violet-50 hover:border-violet-400/70 hover:bg-violet-100/80 disabled:cursor-not-allowed disabled:opacity-50"
            : "border-brand/25 bg-brand/5 hover:border-brand/40 hover:bg-brand/10 disabled:cursor-not-allowed disabled:opacity-50"
        )}
      >
        <div
          className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl shadow-sm",
            additionalMode
              ? "bg-violet-600 text-white"
              : "bg-brand text-brand-foreground"
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-base font-bold text-foreground">{buttonLabel}</p>
          {buttonHint ? (
            <p className="text-sm text-muted-foreground">{buttonHint}</p>
          ) : null}
        </div>
      </button>

      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="driver-expense-sheet-title"
        aria-hidden={!open}
        className={cn(
          "fixed inset-0 z-50 flex flex-col bg-background transition-transform duration-300 ease-out",
          open ? "translate-y-0" : "pointer-events-none translate-y-full"
        )}
      >
        <header className="shrink-0 border-b border-border/60 px-4 pb-3 pt-[max(0.75rem,env(safe-area-inset-top))]">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                additionalMode
                  ? "bg-violet-100 text-violet-700"
                  : "bg-brand/10 text-brand"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <h2
                id="driver-expense-sheet-title"
                className="text-lg font-semibold"
              >
                {sheetTitle}
              </h2>
              <p className="text-sm text-muted-foreground">
                {additionalMode
                  ? "Se reembolsa en tu cuenta pero no afecta el cálculo de tu sueldo"
                  : "Completa los datos y adjunta el comprobante si tienes"}
              </p>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0 rounded-xl"
              onClick={() => setOpen(false)}
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">
          <DriverExpenseForm
            organizationId={organizationId}
            categories={categories}
            tripId={tripId}
            vehicleMode={vehicleMode}
            additionalTripExpense={additionalMode}
            assignedVehicle={assignedVehicle}
            submitLabel={submitLabel}
            onSuccess={handleSuccess}
          />
        </div>
      </section>
    </>
  );
}
