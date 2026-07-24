import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export function DriverPageContainer({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto w-full max-w-md space-y-5 px-4 pb-6 pt-4",
        className
      )}
    >
      {children}
    </div>
  );
}

export function DriverPageHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <header className="space-y-1">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-wider text-brand">
          {eyebrow}
        </p>
      )}
      <h1 className="font-display text-[1.65rem] font-bold leading-tight tracking-tight text-foreground">
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      )}
    </header>
  );
}

export function DriverStepIndicator({
  activeIndex,
}: {
  activeIndex: number;
}) {
  const steps = [
    { label: "Registrar", short: "1" },
    { label: "Gastos", short: "2" },
    { label: "Terminar", short: "3" },
  ];

  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4 shadow-sm">
      <div className="flex items-center">
        {steps.map((step, index) => {
          const done = index < activeIndex;
          const current = index === activeIndex;
          const isLast = index === steps.length - 1;

          return (
            <div key={step.label} className="flex flex-1 items-center">
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold transition-colors",
                    done && "bg-emerald-500 text-white",
                    current && "bg-brand text-brand-foreground shadow-md shadow-brand/25",
                    !done && !current && "bg-muted text-muted-foreground"
                  )}
                >
                  {done ? "✓" : step.short}
                </div>
                <span
                  className={cn(
                    "text-[11px] font-semibold",
                    current ? "text-brand" : "text-muted-foreground"
                  )}
                >
                  {step.label}
                </span>
              </div>
              {!isLast && (
                <div
                  className={cn(
                    "mx-1 mb-5 h-0.5 flex-1 rounded-full",
                    index < activeIndex ? "bg-emerald-400" : "bg-border"
                  )}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function DriverRouteVisual({
  origin,
  destination,
  plate,
}: {
  origin: string;
  destination: string;
  plate?: string;
}) {
  return (
    <div className="flex gap-3">
      <div className="flex flex-col items-center py-1">
        <div className="h-3 w-3 rounded-full border-2 border-brand bg-brand/20" />
        <div className="my-1 w-0.5 flex-1 min-h-[2rem] bg-gradient-to-b from-brand/60 to-brand/10" />
        <div className="h-3 w-3 rounded-full bg-brand" />
      </div>
      <div className="min-w-0 flex-1 space-y-4">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Origen
          </p>
          <p className="truncate text-lg font-bold leading-tight">{origin}</p>
        </div>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Destino
          </p>
          <p className="truncate text-lg font-bold leading-tight">{destination}</p>
          {plate && (
            <p className="mt-1 inline-flex rounded-full bg-white/70 px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
              {plate}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

export function DriverStatChip({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: string;
  tone?: "neutral" | "brand" | "success" | "warning";
}) {
  const tones = {
    neutral: "bg-white/80 text-foreground",
    brand: "bg-brand/15 text-brand",
    success: "bg-emerald-50 text-emerald-700",
    warning: "bg-amber-50 text-amber-800",
  };

  return (
    <div className={cn("rounded-xl px-3 py-2.5", tones[tone])}>
      <p className="text-[10px] font-semibold uppercase tracking-wide opacity-70">
        {label}
      </p>
      <p className="mt-0.5 text-sm font-bold leading-none">{value}</p>
    </div>
  );
}

export function DriverSectionCard({
  title,
  icon: Icon,
  children,
  className,
}: {
  title: string;
  icon?: LucideIcon;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={cn(
        "overflow-hidden rounded-2xl border border-border/70 bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 px-4 py-3">
        {Icon && (
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand/10 text-brand">
            <Icon className="h-4 w-4" />
          </div>
        )}
        <h2 className="text-sm font-semibold">{title}</h2>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

export function DriverEmptyState({
  icon: Icon,
  title,
  description,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl border border-dashed border-border bg-muted/30 px-6 py-10 text-center">
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground">
        <Icon className="h-6 w-6" />
      </div>
      <p className="font-semibold">{title}</p>
      <p className="mt-1 max-w-[16rem] text-sm text-muted-foreground">
        {description}
      </p>
    </div>
  );
}

export function driverFieldClassName(className?: string) {
  return cn(
    "h-12 w-full rounded-xl border border-input bg-background px-4 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
    className
  );
}

export function driverTextareaClassName(className?: string) {
  return cn(
    "min-h-[5rem] w-full resize-none rounded-xl border border-input bg-background px-4 py-3 text-base shadow-sm transition-colors placeholder:text-muted-foreground focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20",
    className
  );
}
