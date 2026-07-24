"use client";

import { useEffect, useId, useState } from "react";
import {
  formatCurrencyInput,
  parseCurrencyInput,
} from "@/lib/format";
import { cn } from "@/lib/utils";

type Props = {
  name: string;
  id?: string;
  defaultValue?: number;
  required?: boolean;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
};

export function CurrencyInput({
  name,
  id,
  defaultValue = 0,
  required,
  placeholder = "0",
  className,
  disabled,
}: Props) {
  const autoId = useId();
  const inputId = id ?? autoId;
  const [display, setDisplay] = useState(() =>
    formatCurrencyInput(defaultValue)
  );
  const [numeric, setNumeric] = useState(
    defaultValue > 0 ? String(defaultValue) : ""
  );

  useEffect(() => {
    setDisplay(formatCurrencyInput(defaultValue));
    setNumeric(defaultValue > 0 ? String(defaultValue) : "");
  }, [defaultValue]);

  function handleChange(raw: string) {
    const parsed = parseCurrencyInput(raw);
    setNumeric(parsed > 0 ? String(parsed) : "");
    setDisplay(parsed > 0 ? formatCurrencyInput(parsed) : "");
  }

  return (
    <div>
      <div
        className={cn(
          "flex h-12 w-full items-center gap-1 rounded-xl border border-input bg-background px-4 text-base shadow-sm transition-colors focus-within:border-brand focus-within:ring-2 focus-within:ring-brand/20",
          disabled && "opacity-60",
          className
        )}
      >
        <span
          className="shrink-0 text-sm font-medium text-muted-foreground"
          aria-hidden
        >
          $
        </span>
        <input
          id={inputId}
          type="text"
          inputMode="numeric"
          autoComplete="off"
          value={display}
          disabled={disabled}
          placeholder={placeholder.replace(/^\$\s*/, "")}
          onChange={(e) => handleChange(e.target.value)}
          className="min-w-0 flex-1 border-0 bg-transparent p-0 text-base outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed"
          aria-required={required}
        />
      </div>
      <input type="hidden" name={name} value={numeric} required={required} />
    </div>
  );
}
