"use client";

import { useCurrency } from "@/providers/currency-provider";
import { formatCurrency } from "@/lib/format";

interface PriceProps {
  amount: number;
  currency: "USD" | "ARS";
  className?: string;
}

export function Price({ amount, currency, className }: PriceProps) {
  const { formatDisplay, isConverted } = useCurrency();

  const converted = isConverted(currency);
  const text = converted
    ? formatDisplay(amount, currency)
    : formatCurrency(amount, currency);

  return (
    <span className={className}>
      {text}
      {converted && (
        <span className="ml-0.5 text-[10px] text-muted-foreground align-super">
          ~
        </span>
      )}
    </span>
  );
}
