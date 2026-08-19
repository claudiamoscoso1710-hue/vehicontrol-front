import { EXPENSE_SCOPE_META, type ExpenseScope } from "@/lib/expenses/expense-scope";
import { cn } from "@/lib/utils";

type Props = {
  scope: ExpenseScope;
  className?: string;
};

export function ExpenseScopeBadge({ scope, className }: Props) {
  const meta = EXPENSE_SCOPE_META[scope];

  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
        meta.badgeClass,
        className
      )}
    >
      {meta.label}
    </span>
  );
}
