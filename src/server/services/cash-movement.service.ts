import { logAction } from "@/lib/audit";
import { serializeDecimals } from "@/lib/serialize";
import { cashMovementModel } from "@/server/models/cash-movement.model";
import type { MovementType } from "@/generated/prisma/client/client";

const MOVEMENT_DECIMAL_FIELDS = [
  "arsIncome", "arsExpense", "usdIncome", "usdExpense", "manualRate",
] as const;

function serializeMovement<T extends Record<string, unknown>>(movement: T) {
  return serializeDecimals(movement, [...MOVEMENT_DECIMAL_FIELDS] as (keyof T)[]);
}

export async function getCashMovements(params?: {
  dateFrom?: Date;
  dateTo?: Date;
  type?: MovementType;
  developmentId?: string;
  saleId?: string;
  search?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}) {
  const movements = await cashMovementModel.findAll(params);
  return movements.map(serializeMovement);
}

export async function getCashMovementById(id: string) {
  const movement = await cashMovementModel.findById(id);
  if (!movement) return null;
  return serializeMovement(movement);
}

export async function getCashMovementsBySale(saleId: string) {
  const movements = await cashMovementModel.findBySaleId(saleId);
  return movements.map(serializeMovement);
}

export async function getCashMovementsSummary(params?: {
  dateFrom?: Date;
  dateTo?: Date;
  developmentId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}) {
  const summary = await cashMovementModel.getSummary(params);
  return {
    arsIncome: summary.arsIncome ? Number(summary.arsIncome) : 0,
    arsExpense: summary.arsExpense ? Number(summary.arsExpense) : 0,
    usdIncome: summary.usdIncome ? Number(summary.usdIncome) : 0,
    usdExpense: summary.usdExpense ? Number(summary.usdExpense) : 0,
  };
}

export async function createCashMovement(
  data: {
    date: Date;
    type: MovementType;
    concept: string;
    detail?: string | null;
    developmentId?: string | null;
    personId?: string | null;
    saleId?: string | null;
    installmentId?: string | null;
    extraChargeId?: string | null;
    arsIncome?: number | null;
    arsExpense?: number | null;
    usdIncome?: number | null;
    usdExpense?: number | null;
    manualRate?: number | null;
    notes?: string | null;
  },
  userId: string
): Promise<void> {
  const movement = await cashMovementModel.create({
    date: data.date,
    type: data.type,
    concept: data.concept,
    detail: data.detail || null,
    developmentId: data.developmentId && data.developmentId !== "none" ? data.developmentId : null,
    personId: data.personId && data.personId !== "none" ? data.personId : null,
    saleId: data.saleId && data.saleId !== "none" ? data.saleId : null,
    installmentId: data.installmentId || null,
    extraChargeId: data.extraChargeId || null,
    arsIncome: data.arsIncome ?? null,
    arsExpense: data.arsExpense ?? null,
    usdIncome: data.usdIncome ?? null,
    usdExpense: data.usdExpense ?? null,
    manualRate: data.manualRate ?? null,
    notes: data.notes || null,
    registeredById: userId,
  });

  await logAction("CashMovement", movement.id, "CREATE", {
    newData: {
      type: data.type,
      concept: data.concept,
      arsIncome: data.arsIncome,
      usdIncome: data.usdIncome,
      arsExpense: data.arsExpense,
      usdExpense: data.usdExpense,
    },
  }, userId);
}
