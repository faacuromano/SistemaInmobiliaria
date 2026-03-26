"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { cashMovementCreateSchema } from "@/schemas/cash-movement.schema";
import * as cashMovementService from "@/server/services/cash-movement.service";
import type { ActionResult } from "@/types/actions";
import type { MovementType } from "@/types/enums";

export async function getCashMovements(params?: {
  dateFrom?: string;
  dateTo?: string;
  type?: MovementType;
  developmentId?: string;
  saleId?: string;
  search?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}) {
  await requirePermission("cash:view");

  try {
    return await cashMovementService.getCashMovements({
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
      type: params?.type,
      developmentId: params?.developmentId,
      saleId: params?.saleId,
      search: params?.search,
      paymentMethod: params?.paymentMethod,
      bankAccountId: params?.bankAccountId,
    });
  } catch (error) {
    console.error("Error fetching cash movements:", error);
    return [];
  }
}

export async function getCashMovementById(id: string) {
  await requirePermission("cash:view");

  try {
    return await cashMovementService.getCashMovementById(id);
  } catch (error) {
    console.error("Error fetching cash movement:", error);
    return null;
  }
}

export async function getCashMovementsBySale(saleId: string) {
  await requirePermission("sales:view");

  try {
    return await cashMovementService.getCashMovementsBySale(saleId);
  } catch (error) {
    console.error("Error fetching sale movements:", error);
    return [];
  }
}

export async function getCashMovementsSummary(params?: {
  dateFrom?: string;
  dateTo?: string;
  developmentId?: string;
  paymentMethod?: string;
  bankAccountId?: string;
}) {
  await requirePermission("cash:view");

  try {
    return await cashMovementService.getCashMovementsSummary({
      dateFrom: params?.dateFrom ? new Date(params.dateFrom) : undefined,
      dateTo: params?.dateTo ? new Date(params.dateTo) : undefined,
      developmentId: params?.developmentId,
      paymentMethod: params?.paymentMethod,
      bankAccountId: params?.bankAccountId,
    });
  } catch (error) {
    console.error("Error fetching cash movements summary:", error);
    return { arsIncome: 0, arsExpense: 0, usdIncome: 0, usdExpense: 0 };
  }
}

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

  try {
    await cashMovementService.createCashMovement(
      {
        date: new Date(parsed.data.date),
        type: parsed.data.type,
        concept: parsed.data.concept,
        detail: parsed.data.detail || null,
        developmentId: parsed.data.developmentId || null,
        personId: parsed.data.personId || null,
        saleId: parsed.data.saleId || null,
        installmentId: parsed.data.installmentId || null,
        extraChargeId: parsed.data.extraChargeId || null,
        arsIncome: parsed.data.arsIncome ?? null,
        arsExpense: parsed.data.arsExpense ?? null,
        usdIncome: parsed.data.usdIncome ?? null,
        usdExpense: parsed.data.usdExpense ?? null,
        manualRate: parsed.data.manualRate ?? null,
        notes: parsed.data.notes || null,
      },
      session.user.id
    );

    revalidatePath("/caja");
    return { success: true };
  } catch (error) {
    console.error("Error creating cash movement:", error);
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el movimiento de caja" };
  }
}
