"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { saleModel } from "@/server/models/sale.model";
import { saleCreateSchema } from "@/schemas/sale.schema";
import { generateInstallments } from "@/lib/installment-generator";
import { logAction } from "@/server/actions/audit-log.actions";
import { systemConfigModel } from "@/server/models/system-config.model";
import type { ActionResult } from "@/types/actions";
import { Prisma } from "@/generated/prisma/client/client";
import type { SaleStatus, LotStatus } from "@/generated/prisma/client/client";

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

  // Compute effective status: PENDIENTE/PARCIAL past due → VENCIDA
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  function overdueStatus(status: string, dueDate: Date): string {
    if ((status === "PENDIENTE" || status === "PARCIAL") && new Date(dueDate) < today) {
      return "VENCIDA";
    }
    return status;
  }

  // Serialize Decimals before passing to client
  return {
    ...sale,
    totalPrice: Number(sale.totalPrice),
    downPayment: sale.downPayment ? Number(sale.downPayment) : null,
    firstInstallmentAmount: sale.firstInstallmentAmount
      ? Number(sale.firstInstallmentAmount)
      : null,
    regularInstallmentAmount: sale.regularInstallmentAmount
      ? Number(sale.regularInstallmentAmount)
      : null,
    commissionAmount: sale.commissionAmount
      ? Number(sale.commissionAmount)
      : null,
    lot: {
      ...sale.lot,
      area: sale.lot.area ? Number(sale.lot.area) : null,
      listPrice: sale.lot.listPrice ? Number(sale.lot.listPrice) : null,
    },
    installments: sale.installments.map((inst) => ({
      ...inst,
      amount: Number(inst.amount),
      originalAmount: inst.originalAmount ? Number(inst.originalAmount) : null,
      paidAmount: Number(inst.paidAmount),
      status: overdueStatus(inst.status, inst.dueDate),
    })),
    extraCharges: sale.extraCharges.map((ec) => ({
      ...ec,
      amount: Number(ec.amount),
      paidAmount: Number(ec.paidAmount),
      status: overdueStatus(ec.status, ec.dueDate),
    })),
  };
}

// Map sale status to lot status
function getLotStatusForSale(
  saleStatus: string
): LotStatus {
  switch (saleStatus) {
    case "CONTADO":
      return "CONTADO" as LotStatus;
    case "CESION":
      return "PERMUTA" as LotStatus;
    default:
      return "VENDIDO" as LotStatus;
  }
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
    // regularInstallmentAmount is auto-calculated server-side, not from form
    firstInstallmentMonth: formData.get("firstInstallmentMonth") ?? undefined,
    collectionDay: formData.get("collectionDay") ?? undefined,
    commissionAmount: formData.get("commissionAmount") ?? undefined,
    status: formData.get("status"),
    signingDate: formData.get("signingDate") ?? undefined,
    notes: formData.get("notes") ?? undefined,
    paymentWindow: formData.get("paymentWindow") ?? undefined,
    extraCharges: formData.get("extraCharges") as string ?? undefined,
  };

  const parsed = saleCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const data = parsed.data;

  // Validate lot exists and is available
  const lot = await prisma.lot.findUnique({
    where: { id: data.lotId },
    select: { id: true, status: true },
  });
  if (!lot) {
    return { success: false, error: "El lote no existe" };
  }
  if (lot.status !== "DISPONIBLE" && lot.status !== "RESERVADO") {
    return { success: false, error: "El lote no está disponible para venta" };
  }

  // Validate person exists
  const person = await prisma.person.findUnique({
    where: { id: data.personId },
    select: { id: true },
  });
  if (!person) {
    return { success: false, error: "La persona no existe" };
  }

  // Validate seller exists (if provided)
  if (data.sellerId) {
    const seller = await prisma.user.findUnique({
      where: { id: data.sellerId, isSeller: true },
      select: { id: true },
    });
    if (!seller) {
      return { success: false, error: "El vendedor no existe" };
    }
  }

  // Validate down payment does not exceed total price
  if (data.downPayment && data.downPayment > data.totalPrice) {
    return {
      success: false,
      error: `La entrega (${data.downPayment}) no puede superar el precio total (${data.totalPrice})`,
    };
  }

  // Validate installment fields for ACTIVA sales with installments
  if (data.status === "ACTIVA" && data.totalInstallments > 0) {
    if (!data.firstInstallmentMonth) {
      return { success: false, error: "El mes de primera cuota es requerido" };
    }
    if (!data.collectionDay) {
      return { success: false, error: "El día de cobro es requerido" };
    }

    // Auto-calculate installment amount (discount planned extra charges)
    const totalExtraCharges = (data.extraCharges ?? []).reduce((sum, ec) => sum + ec.amount, 0);
    const financedAmount = data.totalPrice - (data.downPayment || 0) - totalExtraCharges;
    if (financedAmount <= 0) {
      return { success: false, error: "La entrega y refuerzos cubren el total del precio. No hay monto a financiar en cuotas." };
    }

    if (data.firstInstallmentAmount && data.totalInstallments > 1) {
      // First installment is custom, rest are calculated
      if (data.firstInstallmentAmount >= financedAmount) {
        return { success: false, error: "El monto de la 1ra cuota debe ser menor al monto a financiar" };
      }
      const remainingAmount = financedAmount - data.firstInstallmentAmount;
      const remainingInstallments = data.totalInstallments - 1;
      data.regularInstallmentAmount = Math.round((remainingAmount / remainingInstallments) * 100) / 100;
    } else {
      // All installments equal
      data.firstInstallmentAmount = undefined;
      const calculatedAmount = financedAmount / data.totalInstallments;
      data.regularInstallmentAmount = Math.round(calculatedAmount * 100) / 100;
    }
  }

  // CONTADO/CESION must have 0 installments
  if ((data.status === "CONTADO" || data.status === "CESION") && data.totalInstallments !== 0) {
    return { success: false, error: "Ventas al contado o cesión no pueden tener cuotas" };
  }

  let saleId: string;
  try {
    const lotStatus = getLotStatusForSale(data.status);

    saleId = await prisma.$transaction(async (tx) => {
      // 1. Create sale
      const sale = await tx.sale.create({
        data: {
          lotId: data.lotId,
          personId: data.personId,
          sellerId: data.sellerId || null,
          saleDate: new Date(data.saleDate),
          signingDate: data.signingDate ? new Date(data.signingDate) : null,
          totalPrice: data.totalPrice,
          downPayment: data.downPayment ?? null,
          currency: data.currency,
          totalInstallments: data.totalInstallments,
          firstInstallmentAmount: data.firstInstallmentAmount ?? null,
          regularInstallmentAmount: data.regularInstallmentAmount ?? null,
          firstInstallmentMonth: data.firstInstallmentMonth || null,
          collectionDay: data.collectionDay ?? null,
          commissionAmount: data.commissionAmount ?? null,
          status: data.status,
          notes: data.notes || null,
          paymentWindow: data.paymentWindow || null,
          createdById: session.user.id,
        },
      });

      // 2. Generate installments (if applicable)
      if (data.totalInstallments > 0 && data.regularInstallmentAmount && data.firstInstallmentMonth && data.collectionDay) {
        const installments = generateInstallments({
          saleId: sale.id,
          totalInstallments: data.totalInstallments,
          regularInstallmentAmount: data.regularInstallmentAmount,
          firstInstallmentAmount: data.firstInstallmentAmount,
          firstInstallmentMonth: data.firstInstallmentMonth,
          collectionDay: data.collectionDay,
          currency: data.currency,
        });

        await tx.installment.createMany({ data: installments });
      }

      // 3. Create extra charges (refuerzos) if any
      if (data.status === "ACTIVA" && data.extraCharges && data.extraCharges.length > 0) {
        await tx.extraCharge.createMany({
          data: data.extraCharges.map((ec) => ({
            saleId: sale.id,
            description: ec.description,
            amount: ec.amount,
            currency: data.currency,
            dueDate: new Date(ec.dueDate),
            status: "PENDIENTE" as const,
            paidAmount: 0,
            isInKind: false,
            notes: ec.notes || null,
            createdById: session.user.id,
          })),
        });
      }

      // 4. Update lot status
      await tx.lot.update({
        where: { id: data.lotId },
        data: { status: lotStatus },
      });

      return sale.id;
    });

    await logAction("Sale", saleId, "CREATE", {
      newData: { lotId: data.lotId, personId: data.personId, totalPrice: data.totalPrice, status: data.status, currency: data.currency },
    }, session.user.id);
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return { success: false, error: "Ya existe una venta registrada para este lote. Si fue cancelada, debe eliminarse primero." };
      }
      if (error.code === "P2003") {
        return { success: false, error: "Referencia invalida: verifique que el lote, persona y vendedor existan." };
      }
    }
    console.error("Error al crear venta:", error);
    return { success: false, error: "Error al crear la venta" };
  }

  revalidatePath("/ventas");
  revalidatePath("/desarrollos");
  return { success: true, data: { saleId } };
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

  const sale = await saleModel.findById(id);
  if (!sale) {
    return { success: false, error: "Venta no encontrada" };
  }

  if (sale.status !== "ACTIVA") {
    return { success: false, error: "Solo se pueden cancelar ventas activas" };
  }

  try {
    await prisma.$transaction(async (tx) => {
      // 1. Update sale status to CANCELADA
      await tx.sale.update({
        where: { id },
        data: { status: "CANCELADA" },
      });

      // 2. Revert lot status to DISPONIBLE
      await tx.lot.update({
        where: { id: sale.lotId },
        data: { status: "DISPONIBLE" },
      });
    });

    await logAction("Sale", id, "UPDATE", {
      oldData: { status: "ACTIVA" },
      newData: { status: "CANCELADA" },
    });
  } catch {
    return { success: false, error: "Error al cancelar la venta" };
  }

  revalidatePath("/ventas");
  revalidatePath("/desarrollos");
  return { success: true };
}
