"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";

type DisplayCurrency = "USD" | "ARS";

interface CurrencyContextValue {
  displayCurrency: DisplayCurrency;
  blueSellRate: number | null;
  toggleCurrency: () => void;
  convert: (amount: number, originalCurrency: "USD" | "ARS") => number;
  formatDisplay: (amount: number, originalCurrency: "USD" | "ARS") => string;
  isConverted: (originalCurrency: "USD" | "ARS") => boolean;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

const usdFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const arsFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
});

export function CurrencyProvider({
  blueSellRate,
  children,
}: {
  blueSellRate: number | null;
  children: ReactNode;
}) {
  const [displayCurrency, setDisplayCurrency] = useState<DisplayCurrency>("USD");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("displayCurrency");
    if (saved === "USD" || saved === "ARS") {
      setDisplayCurrency(saved);
    }
    setHydrated(true);
  }, []);

  const toggleCurrency = useCallback(() => {
    setDisplayCurrency((prev) => {
      const next = prev === "USD" ? "ARS" : "USD";
      localStorage.setItem("displayCurrency", next);
      return next;
    });
  }, []);

  const convert = useCallback(
    (amount: number, originalCurrency: "USD" | "ARS"): number => {
      if (!blueSellRate || displayCurrency === originalCurrency) return amount;

      if (displayCurrency === "ARS" && originalCurrency === "USD") {
        return amount * blueSellRate;
      }
      if (displayCurrency === "USD" && originalCurrency === "ARS") {
        return amount / blueSellRate;
      }
      return amount;
    },
    [displayCurrency, blueSellRate]
  );

  const formatDisplay = useCallback(
    (amount: number, originalCurrency: "USD" | "ARS"): string => {
      if (!blueSellRate || displayCurrency === originalCurrency) {
        return originalCurrency === "USD"
          ? usdFormatter.format(amount)
          : arsFormatter.format(amount);
      }

      const converted = convert(amount, originalCurrency);
      return displayCurrency === "USD"
        ? usdFormatter.format(converted)
        : arsFormatter.format(converted);
    },
    [displayCurrency, blueSellRate, convert]
  );

  const isConverted = useCallback(
    (originalCurrency: "USD" | "ARS"): boolean => {
      return !!blueSellRate && displayCurrency !== originalCurrency;
    },
    [displayCurrency, blueSellRate]
  );

  // Prevent hydration mismatch by not rendering until client-side
  if (!hydrated) {
    return <>{children}</>;
  }

  return (
    <CurrencyContext.Provider
      value={{
        displayCurrency,
        blueSellRate,
        toggleCurrency,
        convert,
        formatDisplay,
        isConverted,
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) {
    // Return a fallback that uses original currency (for SSR or outside provider)
    return {
      displayCurrency: "USD" as DisplayCurrency,
      blueSellRate: null,
      toggleCurrency: () => {},
      convert: (amount: number) => amount,
      formatDisplay: (amount: number, currency: "USD" | "ARS") =>
        currency === "USD"
          ? usdFormatter.format(amount)
          : arsFormatter.format(amount),
      isConverted: () => false,
    };
  }
  return ctx;
}
