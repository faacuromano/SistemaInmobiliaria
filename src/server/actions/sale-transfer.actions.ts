"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import * as transferService from "@/server/services/sale-transfer.service";
import { saleTransferSchema } from "@/schemas/sale-transfer.schema";
import type { ActionResult } from "@/types/actions";

export async function transferSale(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("sales:manage");

  const raw = {
    saleId: formData.get("saleId"),
    toPersonId: formData.get("toPersonId"),
    transferDate: formData.get("transferDate"),
    renegotiate: formData.get("renegotiate"),
    newInstallments: formData.get("newInstallments") || "",
    notes: formData.get("notes") || "",
  };

  const parsed = saleTransferSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await transferService.transferSale(parsed.data, session.user.id);
    revalidatePath("/ventas");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al transferir la venta" };
  }
}

export async function getTransferHistory(saleId: string) {
  await requirePermission("sales:view");
  const transfers = await transferService.getTransferHistory(saleId);
  return transfers.map((t) => ({
    ...t,
    transferDate: t.transferDate.toISOString(),
    createdAt: t.createdAt.toISOString(),
  }));
}
