export type DashboardMonthOption = {
  id: string;
  label: string;
  isCurrent: boolean;
};

export type DashboardMonthContext = {
  monthId: string;
  year: number;
  month: number;
  isCurrentMonth: boolean;
  label: string;
  rangeLabel: string;
  start: string;
  end: string;
  options: DashboardMonthOption[];
};

const MONTH_FORMAT = /^\d{4}-(0[1-9]|1[0-2])$/;

export function parseDashboardMonthParam(value?: string | null): {
  year: number;
  month: number;
} {
  if (value && MONTH_FORMAT.test(value)) {
    const [year, month] = value.split("-").map(Number);
    return { year, month };
  }

  const now = new Date();
  return { year: now.getFullYear(), month: now.getMonth() + 1 };
}

export function getMonthBounds(year: number, month: number): {
  start: string;
  end: string;
} {
  const start = new Date(year, month - 1, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month, 1);
  end.setHours(0, 0, 0, 0);

  return {
    start: start.toISOString(),
    end: end.toISOString(),
  };
}

export function formatDashboardMonthLabel(year: number, month: number): string {
  return new Intl.DateTimeFormat("es-CO", {
    month: "long",
    year: "numeric",
  }).format(new Date(year, month - 1, 1));
}

export function buildDashboardMonthOptions(count = 12): DashboardMonthOption[] {
  const now = new Date();

  return Array.from({ length: count }, (_, index) => {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const id = `${year}-${String(month).padStart(2, "0")}`;

    return {
      id,
      label:
        index === 0
          ? `Mes actual · ${formatDashboardMonthLabel(year, month)}`
          : formatDashboardMonthLabel(year, month),
      isCurrent: index === 0,
    };
  });
}

export function resolveDashboardMonthContext(
  monthParam?: string | null,
  optionsCount = 12
): DashboardMonthContext {
  const options = buildDashboardMonthOptions(optionsCount);
  const parsed = parseDashboardMonthParam(monthParam);
  const monthId = `${parsed.year}-${String(parsed.month).padStart(2, "0")}`;
  const selected = options.find((option) => option.id === monthId) ?? options[0];
  const [year, month] = selected.id.split("-").map(Number);
  const { start, end } = getMonthBounds(year, month);
  const label = formatDashboardMonthLabel(year, month);

  return {
    monthId: selected.id,
    year,
    month,
    isCurrentMonth: selected.isCurrent,
    label,
    rangeLabel: selected.isCurrent
      ? `${label} (mes en curso)`
      : label,
    start,
    end,
    options,
  };
}
