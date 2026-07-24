import { cn } from "@/lib/utils";
import { statusLabel } from "@/lib/ui/status";

const STATUS_STYLES: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800 border-amber-200",
  approved: "bg-emerald-100 text-emerald-800 border-emerald-200",
  rejected: "bg-red-100 text-red-800 border-red-200",
  in_progress: "bg-sky-100 text-sky-800 border-sky-200",
  planned: "bg-violet-100 text-violet-800 border-violet-200",
  closed: "bg-slate-100 text-slate-700 border-slate-200",
  active: "bg-emerald-100 text-emerald-800 border-emerald-200",
  inactive: "bg-slate-100 text-slate-600 border-slate-200",
};

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium",
        STATUS_STYLES[status] ?? "bg-muted text-muted-foreground border-border",
        className
      )}
    >
      {statusLabel(status)}
    </span>
  );
}
