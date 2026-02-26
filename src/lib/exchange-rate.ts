"use server";

// Types for dolarapi.com response
interface DolarApiRate {
  moneda: string;
  casa: string;
  nombre: string;
  compra: number;
  venta: number;
  fechaActualizacion: string;
}

/**
 * Fetch current exchange rates from dolarapi.com
 * Returns rates for oficial, blue, and cripto dollar
 */
export async function fetchDolarApiRates(): Promise<{
  officialBuy: number | null;
  officialSell: number | null;
  blueBuy: number | null;
  blueSell: number | null;
  cryptoBuy: number | null;
  cryptoSell: number | null;
} | null> {
  try {
    const response = await fetch("https://dolarapi.com/v1/dolares", {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!response.ok) return null;

    const rates: DolarApiRate[] = await response.json();

    const oficial = rates.find((r) => r.casa === "oficial");
    const blue = rates.find((r) => r.casa === "blue");
    const cripto = rates.find((r) => r.casa === "cripto");

    return {
      officialBuy: oficial?.compra ?? null,
      officialSell: oficial?.venta ?? null,
      blueBuy: blue?.compra ?? null,
      blueSell: blue?.venta ?? null,
      cryptoBuy: cripto?.compra ?? null,
      cryptoSell: cripto?.venta ?? null,
    };
  } catch {
    return null;
  }
}

/**
 * Convert amount between currencies using a given rate
 */
export async function convertCurrency(
  amount: number,
  fromCurrency: "USD" | "ARS",
  toCurrency: "USD" | "ARS",
  rate: number
): Promise<number> {
  if (fromCurrency === toCurrency) return amount;
  if (fromCurrency === "USD" && toCurrency === "ARS") {
    return amount * rate;
  }
  // ARS to USD
  return rate > 0 ? amount / rate : 0;
}
