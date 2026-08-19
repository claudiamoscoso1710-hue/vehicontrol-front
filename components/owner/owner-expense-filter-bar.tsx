"use client";

import { Filter, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  EMPTY_OWNER_EXPENSE_FILTERS,
  hasActiveOwnerExpenseFilters,
  type OwnerExpenseFilters,
} from "@/lib/expenses/filter-owner-expenses";
import { EXPENSE_SCOPE_META } from "@/lib/expenses/expense-scope";
import { formatCurrency } from "@/lib/format";

type VehicleOption = { id: string; plate: string };

type Props = {
  filters: OwnerExpenseFilters;
  onChange: (filters: OwnerExpenseFilters) => void;
  vehicles: VehicleOption[];
  visibleCount: number;
  totalCount: number;
  filteredTotal: number;
};

const inputClassName =
  "w-full rounded-lg border bg-background px-3 py-2 text-sm";

export function OwnerExpenseFilterBar({
  filters,
  onChange,
  vehicles,
  visibleCount,
  totalCount,
  filteredTotal,
}: Props) {
  const active = hasActiveOwnerExpenseFilters(filters);

  function update(partial: Partial<OwnerExpenseFilters>) {
    onChange({ ...filters, ...partial });
  }

  function clearFilters() {
    onChange(EMPTY_OWNER_EXPENSE_FILTERS);
  }

  return (
    <section className="space-y-3 rounded-xl border bg-card p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-muted text-muted-foreground">
          <Filter className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold">Filtrar gastos</p>
          <p className="text-sm text-muted-foreground">
            Por fecha, tipo o vehículo para encontrar y editar más rápido.
          </p>
        </div>
        {active ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="shrink-0 gap-1.5 text-muted-foreground"
          >
            <X className="h-4 w-4" />
            Limpiar
          </Button>
        ) : null}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Desde
          </span>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(event) => update({ dateFrom: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Hasta
          </span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(event) => update({ dateTo: event.target.value })}
            className={inputClassName}
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Tipo de gasto
          </span>
          <select
            value={filters.scopeType}
            onChange={(event) =>
              update({
                scopeType: event.target.value as OwnerExpenseFilters["scopeType"],
              })
            }
            className={inputClassName}
          >
            <option value="all">Todos</option>
            <option value="trip">{EXPENSE_SCOPE_META.trip.label}</option>
            <option value="vehicle">{EXPENSE_SCOPE_META.vehicle.label}</option>
            <option value="additional">
              {EXPENSE_SCOPE_META.additional.label}
            </option>
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium text-muted-foreground">
            Vehículo
          </span>
          <select
            value={filters.vehicleId}
            onChange={(event) => update({ vehicleId: event.target.value })}
            className={inputClassName}
          >
            <option value="">Todos</option>
            {vehicles.map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate}
              </option>
            ))}
          </select>
        </label>
      </div>

      {active ? (
        <p className="text-sm text-muted-foreground">
          Mostrando {visibleCount} de {totalCount} gasto
          {totalCount === 1 ? "" : "s"}
          {visibleCount > 0 ? ` · Total ${formatCurrency(filteredTotal)}` : ""}
        </p>
      ) : null}
    </section>
  );
}
