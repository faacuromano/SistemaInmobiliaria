"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { saleModel } from "@/server/models/sale.model";
import { systemConfigModel } from "@/server/models/system-config.model";
import { saleCreateSchema } from "@/schemas/sale.schema";
import { newInstallmentPlanSchema } from "@/schemas/new-installment-plan.schema";
import * as saleService from "@/server/services/sale.service";
import type { ActionResult } from "@/types/actions";
import type { SaleStatus } from "@/generated/prisma/client/client";

export async function getSales(params?: {
  search?: string;
  status?: SaleStatus;
  developmentId?: string;
}) {
  await requirePermission("sales:view");
  return saleModel.findAll(params);
}

export async function getSaleById(id: string) {
  await requirePermission("sales:view");
  const sale = await saleModel.findById(id);
  if (!sale) return null;
  return saleService.serializeSaleForClient(sale);
}

export async function createSale(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult<{ saleId: string }>> {
  const session = await requirePermission("sales:manage");

  const raw = {
    lotId: formData.get("lotId"),
    personId: formData.get("personId"),
    sellerId: formData.get("sellerId") ?? undefined,
    saleDate: formData.get("saleDate"),
    totalPrice: formData.get("totalPrice"),
    downPayment: formData.get("downPayment") ?? undefined,
    currency: formData.get("currency"),
    totalInstallments: formData.get("totalInstallments"),
    firstInstallmentAmount: formData.get("firstInstallmentAmount") ?? undefined,
    firstInstallmentMonth: formData.get("firstInstallmentMonth") ?? undefined,
    collectionDay: formData.get("collectionDay") ?? undefined,
    commissionAmount: formData.get("commissionAmount") ?? undefined,
    exchangeRateOverride: formData.get("exchangeRateOverride") ?? undefined,
    status: formData.get("status"),
    signingDate: formData.get("signingDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    paymentWindow: formData.get("paymentWindow") ?? undefined,
    extraCharges: (formData.get("extraCharges") as string) ?? undefined,
  };

  const parsed = saleCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    const saleId = await saleService.createSale(parsed.data, session.user.id);
    revalidatePath("/ventas");
    revalidatePath("/desarrollos");
    return { success: true, data: { saleId } };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la venta" };
  }
}

export async function getSaleForPrint(id: string) {
  await requirePermission("sales:view");
  const [sale, companyName] = await Promise.all([
    getSaleById(id),
    systemConfigModel.get("company_name"),
  ]);
  if (!sale) return null;
  return { ...sale, companyName: companyName ?? "Sistema Inmobiliaria" };
}

export async function cancelSale(id: string): Promise<ActionResult> {
  await requirePermission("sales:manage");

  try {
    await saleService.cancelSale(id);
    revalidatePath("/ventas");
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al cancelar la venta" };
  }
}

export async function createNewInstallmentPlan(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("sales:manage");

  const raw = {
    saleId: formData.get("saleId"),
    totalInstallments: formData.get("totalInstallments"),
    installmentMode: formData.get("installmentMode"),
    firstInstallmentMonth: formData.get("firstInstallmentMonth"),
    collectionDay: formData.get("collectionDay"),
    manualInstallments: formData.get("manualInstallments") || "",
  };

  const parsed = newInstallmentPlanSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await saleService.createNewInstallmentPlan(parsed.data, session.user.id);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el plan de cuotas" };
  }
}
