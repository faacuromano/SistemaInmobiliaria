"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { cashBalanceModel } from "@/server/models/cash-balance.model";
import { prisma } from "@/lib/prisma";
import type { ActionResult } from "@/types/actions";

// Serialize Prisma Decimal fields to plain numbers for client consumption
function serializeBalance(balance: Record<string, unknown>) {
  return {
    ...balance,
    arsBalance: balance.arsBalance ? Number(balance.arsBalance) : 0,
    usdBalance: balance.usdBalance ? Number(balance.usdBalance) : 0,
  };
}

/**
 * List cash balances with optional filters.
 */
export async function getCashBalances(params?: {
  developmentId?: string;
  year?: number;
}) {
  await requirePermission("cash:view");

  try {
    const balances = await cashBalanceModel.findAll({
      developmentId: params?.developmentId,
      year: params?.year,
    });

    return balances.map(serializeBalance);
  } catch (error) {
    console.error("Error fetching cash balances:", error);
    return [];
  }
}

/**
 * Generate a monthly balance for a specific development.
 * Calculates from CashMovement aggregation and upserts the result.
 */
export async function generateMonthlyBalance(
  developmentId: string | null,
  month: number,
  year: number
): Promise<ActionResult> {
  await requirePermission("cash:manage");

  try {
    const calculated = await cashBalanceModel.calculateFromMovements(
      developmentId,
      month,
      year
    );

    await cashBalanceModel.upsert({
      developmentId,
      month,
      year,
      arsBalance: calculated.arsBalance,
      usdBalance: calculated.usdBalance,
    });

    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    console.error("Error generating monthly balance:", error);
    return { success: false, error: "Error al generar el balance mensual" };
  }
}

/**
 * Generate balances for ALL developments for a given month/year.
 */
export async function generateAllBalances(
  month: number,
  year: number
): Promise<ActionResult> {
  await requirePermission("cash:manage");

  try {
    const developments = await prisma.development.findMany({
      select: { id: true },
    });

    // Calculate balance for each development
    for (const dev of developments) {
      const calculated = await cashBalanceModel.calculateFromMovements(
        dev.id,
        month,
        year
      );

      await cashBalanceModel.upsert({
        developmentId: dev.id,
        month,
        year,
        arsBalance: calculated.arsBalance,
        usdBalance: calculated.usdBalance,
      });
    }

    // Also calculate balance for movements without development ("General")
    const generalCalculated = await cashBalanceModel.calculateFromMovements(
      null,
      month,
      year
    );
    if (
      generalCalculated.arsBalance !== 0 ||
      generalCalculated.usdBalance !== 0
    ) {
      await cashBalanceModel.upsert({
        developmentId: null,
        month,
        year,
        arsBalance: generalCalculated.arsBalance,
        usdBalance: generalCalculated.usdBalance,
      });
    }

    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    console.error("Error generating all balances:", error);
    return {
      success: false,
      error: "Error al generar los balances mensuales",
    };
  }
}
