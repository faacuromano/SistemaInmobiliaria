"use client";

import { useState, useEffect } from "react";
import { Check, AlertTriangle } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { fetchDolarApiRates } from "@/lib/exchange-rate";

interface CurrencyEquivalenceProps {
  enteredAmount: number;
  enteredCurrency: "USD" | "ARS";
  installmentCurrency: "USD" | "ARS";
  remainingAmount: number;
  manualRate: number | undefined;
}

export function CurrencyEquivalence({
  enteredAmount,
  enteredCurrency,
  installmentCurrency,
  remainingAmount,
  manualRate,
}: CurrencyEquivalenceProps) {
  const [apiRate, setApiRate] = useState<number | null>(null);
  const [rateError, setRateError] = useState(false);

  // Fetch exchange rate on mount (single fetch per dialog session)
  useEffect(() => {
    let cancelled = false;
    fetchDolarApiRates()
      .then((rates) => {
        if (cancelled) return;
        if (rates?.blueSell) {
          setApiRate(rates.blueSell);
        } else {
          setRateError(true);
        }
      })
      .catch(() => {
        if (!cancelled) setRateError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Don't show anything when amount is 0 or empty
  if (!enteredAmount || enteredAmount <= 0) return null;

  const effectiveRate = manualRate || apiRate;

  // If no rate available, show fallback
  if (!effectiveRate) {
    if (rateError) {
      return (
        <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
          Cotizacion no disponible — ingrese cotizacion manual
        </div>
      );
    }
    return null; // Still loading
  }

  // Calculate equivalence
  // If entered in USD, show ARS equivalent; if entered in ARS, show USD equivalent
  let equivalentAmount: number;
  let equivalentCurrency: "USD" | "ARS";

  if (enteredCurrency === "USD") {
    equivalentAmount = enteredAmount * effectiveRate;
    equivalentCurrency = "ARS";
  } else {
    equivalentAmount = enteredAmount / effectiveRate;
    equivalentCurrency = "USD";
  }

  // Coverage check: compare entered amount against remaining in the installment's currency
  // If currencies match, direct comparison
  // If currencies differ, convert entered amount to installment currency and compare
  let amountInInstallmentCurrency: number;
  if (enteredCurrency === installmentCurrency) {
    amountInInstallmentCurrency = enteredAmount;
  } else if (enteredCurrency === "USD" && installmentCurrency === "ARS") {
    amountInInstallmentCurrency = enteredAmount * effectiveRate;
  } else {
    // enteredCurrency === "ARS" && installmentCurrency === "USD"
    amountInInstallmentCurrency = enteredAmount / effectiveRate;
  }

  const covers = amountInInstallmentCurrency >= remainingAmount;
  const shortfall = remainingAmount - amountInInstallmentCurrency;

  return (
    <div className="space-y-2">
      {/* Equivalence line */}
      <div className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
        Equivale a {formatCurrency(equivalentAmount, equivalentCurrency)}{" "}
        (cotiz. {formatCurrency(effectiveRate, "ARS")})
      </div>

      {/* Coverage check */}
      {covers ? (
        <div className="flex items-center gap-2 rounded-md bg-emerald-50 p-3 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-400">
          <Check className="h-4 w-4 shrink-0" />
          <span>
            Cubre la cuota pendiente (
            {formatCurrency(remainingAmount, installmentCurrency)})
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <AlertTriangle className="h-4 w-4 shrink-0" />
          <span>
            No cubre la cuota completa — Faltan{" "}
            {formatCurrency(shortfall, installmentCurrency)}
          </span>
        </div>
      )}
    </div>
  );
}
