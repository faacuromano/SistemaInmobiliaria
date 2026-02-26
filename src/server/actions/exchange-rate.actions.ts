"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { exchangeRateModel } from "@/server/models/exchange-rate.model";
import { fetchDolarApiRates } from "@/lib/exchange-rate";
import { manualExchangeRateSchema } from "@/schemas/exchange-rate.schema";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";

// Serialize Decimal fields to numbers for client
function serializeRate(rate: Record<string, unknown> | null) {
  if (!rate) return null;
  return {
    ...rate,
    officialBuy: rate.officialBuy ? Number(rate.officialBuy) : null,
    officialSell: rate.officialSell ? Number(rate.officialSell) : null,
    blueBuy: rate.blueBuy ? Number(rate.blueBuy) : null,
    blueSell: rate.blueSell ? Number(rate.blueSell) : null,
    cryptoBuy: rate.cryptoBuy ? Number(rate.cryptoBuy) : null,
    cryptoSell: rate.cryptoSell ? Number(rate.cryptoSell) : null,
  };
}

/**
 * Get today's exchange rate. Auto-fetches from API if not found in DB.
 */
export async function getTodayExchangeRate() {
  await requirePermission("cash:view");

  try {
    const today = new Date();
    let rate = await exchangeRateModel.findByDate(today);

    if (!rate) {
      // Auto-fetch from dolarapi.com
      const apiRates = await fetchDolarApiRates();
      if (apiRates) {
        rate = await exchangeRateModel.upsertByDate(today, {
          source: "dolarapi",
          ...apiRates,
        });
      }
    }

    return serializeRate(rate);
  } catch (error) {
    console.error("Error fetching exchange rate:", error);
    return null;
  }
}

/**
 * Get exchange rates for a date range
 */
export async function getExchangeRates(dateFrom?: string, dateTo?: string) {
  await requirePermission("cash:view");

  try {
    const from = dateFrom
      ? new Date(dateFrom)
      : new Date(new Date().setDate(new Date().getDate() - 30));
    const to = dateTo ? new Date(dateTo) : new Date();

    const rates = await exchangeRateModel.findByDateRange(from, to);
    return rates.map(serializeRate);
  } catch (error) {
    console.error("Error fetching exchange rates:", error);
    return [];
  }
}

/**
 * Get the latest exchange rate (any date)
 */
export async function getLatestExchangeRate() {
  await requirePermission("cash:view");

  try {
    const rate = await exchangeRateModel.findLatest();
    return serializeRate(rate);
  } catch (error) {
    console.error("Error fetching latest rate:", error);
    return null;
  }
}

/**
 * Manually create/update an exchange rate for a specific date
 */
export async function createManualExchangeRate(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("cash:manage");

  const raw = {
    date: formData.get("date"),
    officialBuy: formData.get("officialBuy") || null,
    officialSell: formData.get("officialSell") || null,
    blueBuy: formData.get("blueBuy") || null,
    blueSell: formData.get("blueSell") || null,
    cryptoBuy: formData.get("cryptoBuy") || null,
    cryptoSell: formData.get("cryptoSell") || null,
  };

  const parsed = manualExchangeRateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos invalidos",
    };
  }

  try {
    const { date, ...rateData } = parsed.data;
    const rate = await exchangeRateModel.upsertByDate(new Date(date), {
      source: "manual",
      officialBuy: rateData.officialBuy ?? undefined,
      officialSell: rateData.officialSell ?? undefined,
      blueBuy: rateData.blueBuy ?? undefined,
      blueSell: rateData.blueSell ?? undefined,
      cryptoBuy: rateData.cryptoBuy ?? undefined,
      cryptoSell: rateData.cryptoSell ?? undefined,
    });

    await logAction("ExchangeRate", rate.id, "UPDATE", {
      newData: { date, source: "manual", ...rateData },
    });

    revalidatePath("/caja");
    return { success: true };
  } catch {
    return { success: false, error: "Error al guardar la cotizacion" };
  }
}
