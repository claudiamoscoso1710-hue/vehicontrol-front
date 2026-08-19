export function PageLoadingSkeleton({ title = "Cargando…" }: { title?: string }) {
  return (
    <div className="animate-pulse space-y-6" aria-busy="true" aria-label={title}>
      <div className="space-y-2">
        <div className="h-4 w-24 rounded-md bg-muted" />
        <div className="h-8 w-56 max-w-full rounded-lg bg-muted" />
        <div className="h-4 w-40 rounded-md bg-muted" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="h-28 rounded-xl bg-muted" />
        ))}
      </div>
      <div className="h-64 rounded-xl bg-muted" />
    </div>
  );
}

export function DriverPageLoadingSkeleton() {
  return (
    <div
      className="mx-auto w-full max-w-md animate-pulse space-y-5 px-4 pb-6 pt-4"
      aria-busy="true"
      aria-label="Cargando"
    >
      <div className="space-y-2">
        <div className="h-3 w-20 rounded bg-muted" />
        <div className="h-8 w-48 rounded-lg bg-muted" />
      </div>
      <div className="h-24 rounded-2xl bg-muted" />
      <div className="h-40 rounded-2xl bg-muted" />
      <div className="h-32 rounded-2xl bg-muted" />
    </div>
  );
}

export function DashboardSectionSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-4" aria-busy="true">
      <div className="h-6 w-48 rounded-md bg-muted" />
      <div className="grid gap-4 md:grid-cols-2">
        {Array.from({ length: rows }).map((_, index) => (
          <div key={index} className="h-36 rounded-xl bg-muted" />
        ))}
      </div>
    </div>
  );
}

export function KpiRowSkeleton() {
  return (
    <div className="grid animate-pulse gap-4 sm:grid-cols-2 xl:grid-cols-4" aria-busy="true">
      {Array.from({ length: 4 }).map((_, index) => (
        <div key={index} className="h-28 rounded-xl bg-muted" />
      ))}
    </div>
  );
}
