"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { cashMovementModel } from "@/server/models/cash-movement.model";
import { cashMovementCreateSchema } from "@/schemas/cash-movement.schema";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";
import type { MovementType } from "@/types/enums";

// Serialize Prisma Decimal fields to plain numbers for client consumption
function serializeMovement(movement: Record<string, unknown>) {
  return {
    ...movement,
    arsIncome: movement.arsIncome ? Number(movement.arsIncome) : null,
    arsExpense: movement.arsExpense ? Number(movement.arsExpense) : null,
    usdIncome: movement.usdIncome ? Number(movement.usdIncome) : null,
    usdExpense: movement.usdExpense ? Number(movement.usdExpense) : null,
    manualRate: movement.manualRate ? Number(movement.manualRate) : null,
  };
}

/**
 * List cash movements with optional filters.
 */
export async function getCashMovements(params?: {
  dateFrom?: string;
  dateTo?: string;
  type?: MovementType;
  developmentId?: string;
  saleId?: string;
  search?: string;
}) {
  await requirePermission("cash:view");

  try {
    const movements = await cashMovementModel.findAll({
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
      type: params?.type,
      developmentId: params?.developmentId,
      saleId: params?.saleId,
      search: params?.search,
    });

    return movements.map(serializeMovement);
  } catch (error) {
    console.error("Error fetching cash movements:", error);
    return [];
  }
}

/**
 * Get a single cash movement by ID with full includes.
 */
export async function getCashMovementById(id: string) {
  await requirePermission("cash:view");

  try {
    const movement = await cashMovementModel.findById(id);
    if (!movement) return null;

    return serializeMovement(movement);
  } catch (error) {
    console.error("Error fetching cash movement:", error);
    return null;
  }
}

/**
 * Get all cash movements for a specific sale.
 */
export async function getCashMovementsBySale(saleId: string) {
  await requirePermission("sales:view");

  try {
    const movements = await cashMovementModel.findBySaleId(saleId);
    return movements.map(serializeMovement);
  } catch (error) {
    console.error("Error fetching sale movements:", error);
    return [];
  }
}

/**
 * Get aggregated totals for cash movements.
 */
export async function getCashMovementsSummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  developmentId?: string;
}) {
  await requirePermission("cash:view");

  try {
    const summary = await cashMovementModel.getSummary({
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
      developmentId: params?.developmentId,
    });

    return {
      arsIncome: summary.arsIncome ? Number(summary.arsIncome) : 0,
      arsExpense: summary.arsExpense ? Number(summary.arsExpense) : 0,
      usdIncome: summary.usdIncome ? Number(summary.usdIncome) : 0,
      usdExpense: summary.usdExpense ? Number(summary.usdExpense) : 0,
    };
  } catch (error) {
    console.error("Error fetching cash movements summary:", error);
    return { arsIncome: 0, arsExpense: 0, usdIncome: 0, usdExpense: 0 };
  }
}

/**
 * Create a general cash movement (non-payment types like SUELDO, GASTO_OFICINA, etc.)
 */
export async function createCashMovement(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("cash:manage");

  const raw = {
    date: formData.get("date"),
    type: formData.get("type"),
    concept: formData.get("concept"),
    detail: formData.get("detail") || "",
    developmentId: formData.get("developmentId") || "",
    personId: formData.get("personId") || "",
    saleId: formData.get("saleId") || "",
    installmentId: formData.get("installmentId") || "",
    extraChargeId: formData.get("extraChargeId") || "",
    arsIncome: formData.get("arsIncome") || "",
    arsExpense: formData.get("arsExpense") || "",
    usdIncome: formData.get("usdIncome") || "",
    usdExpense: formData.get("usdExpense") || "",
    manualRate: formData.get("manualRate") || "",
    notes: formData.get("notes") || "",
  };

  const parsed = cashMovementCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      error: parsed.error.errors[0]?.message || "Datos invalidos",
    };
  }

  const data = parsed.data;

  try {
    const movement = await cashMovementModel.create({
      date: new Date(data.date),
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
      registeredById: session.user.id,
    });

    await logAction("CashMovement", movement.id, "CREATE", {
      newData: { type: data.type, concept: data.concept, arsIncome: data.arsIncome, usdIncome: data.usdIncome, arsExpense: data.arsExpense, usdExpense: data.usdExpense },
    }, session.user.id);

    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    console.error("Error creating cash movement:", error);
    return { success: false, error: "Error al crear el movimiento de caja" };
  }
}
