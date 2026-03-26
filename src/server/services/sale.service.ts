import { prisma } from "@/lib/prisma";
import { generateInstallments } from "@/lib/installment-generator";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { saleModel } from "@/server/models/sale.model";
import { Prisma } from "@/generated/prisma/client/client";
import type { LotStatus } from "@/generated/prisma/client/client";
import type { z } from "zod";
import type { saleCreateSchema } from "@/schemas/sale.schema";

type SaleCreateData = z.output<typeof saleCreateSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getLotStatusForSale(saleStatus: string): LotStatus {
  switch (saleStatus) {
    case "CONTADO":
      return "CONTADO" as LotStatus;
    case "CESION":
      return "PERMUTA" as LotStatus;
    default:
      return "VENDIDO" as LotStatus;
  }
}

// ---------------------------------------------------------------------------
// Validation & Calculation
// ---------------------------------------------------------------------------

async function validateAndCalculate(data: SaleCreateData): Promise<SaleCreateData> {
  // Validate lot exists and is available
  const lot = await prisma.lot.findUnique({
    where: { id: data.lotId },
    select: { id: true, status: true },
  });
  if (!lot) throw new ServiceError("El lote no existe");
  if (lot.status !== "DISPONIBLE" && lot.status !== "RESERVADO") {
    throw new ServiceError("El lote no está disponible para venta");
  }

  // Validate person exists
  const person = await prisma.person.findUnique({
    where: { id: data.personId },
    select: { id: true },
  });
  if (!person) throw new ServiceError("La persona no existe");

  // Validate seller exists (if provided)
  if (data.sellerId) {
    const seller = await prisma.user.findUnique({
      where: { id: data.sellerId, isSeller: true },
      select: { id: true },
    });
    if (!seller) throw new ServiceError("El vendedor no existe");
  }

  // Validate down payment does not exceed total price
  if (data.downPayment && data.downPayment > data.totalPrice) {
    throw new ServiceError(
      `La entrega (${data.downPayment}) no puede superar el precio total (${data.totalPrice})`
    );
  }

  // Calculate installment amounts for ACTIVA sales with installments
  if (data.status === "ACTIVA" && data.totalInstallments > 0) {
    if (!data.firstInstallmentMonth) {
      throw new ServiceError("El mes de primera cuota es requerido");
    }
    if (!data.collectionDay) {
      throw new ServiceError("El día de cobro es requerido");
    }

    const totalExtraCharges = (data.extraCharges ?? []).reduce(
      (sum, ec) => sum + ec.amount,
      0
    );
    const financedAmount =
      data.totalPrice - (data.downPayment || 0) - totalExtraCharges;
    if (financedAmount <= 0) {
      throw new ServiceError(
        "La entrega y refuerzos cubren el total del precio. No hay monto a financiar en cuotas."
      );
    }

    if (data.installmentMode === "MANUAL") {
      // Manual mode: validate that manualInstallments array matches totalInstallments
      const manualInstallments = data.manualInstallments ?? [];
      if (manualInstallments.length !== data.totalInstallments) {
        throw new ServiceError(
          `Se esperan ${data.totalInstallments} cuotas manuales pero se proporcionaron ${manualInstallments.length}`
        );
      }
      const manualTotal = manualInstallments.reduce((sum, i) => sum + i.amount, 0);
      const diff = Math.abs(manualTotal - financedAmount);
      if (diff > 0.02) {
        throw new ServiceError(
          `La suma de cuotas manuales (${manualTotal.toFixed(2)}) no coincide con el monto a financiar (${financedAmount.toFixed(2)})`
        );
      }
      // Set regularInstallmentAmount to 0 (not used in manual mode, but field is required)
      data.regularInstallmentAmount = 0;
    } else if (data.firstInstallmentAmount && data.totalInstallments > 1) {
      if (data.firstInstallmentAmount >= financedAmount) {
        throw new ServiceError(
          "El monto de la 1ra cuota debe ser menor al monto a financiar"
        );
      }
      const remainingAmount = financedAmount - data.firstInstallmentAmount;
      const remainingInstallments = data.totalInstallments - 1;
      data.regularInstallmentAmount =
        Math.round((remainingAmount / remainingInstallments) * 100) / 100;
    } else {
      data.firstInstallmentAmount = undefined;
      data.regularInstallmentAmount =
        Math.round((financedAmount / data.totalInstallments) * 100) / 100;
    }
  }

  // CONTADO/CESION must have 0 installments
  if (
    (data.status === "CONTADO" || data.status === "CESION") &&
    data.totalInstallments !== 0
  ) {
    throw new ServiceError(
      "Ventas al contado o cesión no pueden tener cuotas"
    );
  }

  return data;
}

// ---------------------------------------------------------------------------
// Create Sale
// ---------------------------------------------------------------------------

export async function createSale(
  data: SaleCreateData,
  userId: string
): Promise<string> {
  const validated = await validateAndCalculate(data);
  const lotStatus = getLotStatusForSale(validated.status);

  try {
    const saleId = await prisma.$transaction(async (tx) => {
      // 1. Create sale
      const sale = await tx.sale.create({
        data: {
          lotId: validated.lotId,
          personId: validated.personId,
          sellerId: validated.sellerId || null,
          saleDate: new Date(validated.saleDate),
          signingDate: validated.signingDate
            ? new Date(validated.signingDate)
            : null,
          totalPrice: validated.totalPrice,
          downPayment: validated.downPayment ?? null,
          currency: validated.currency,
          totalInstallments: validated.totalInstallments,
          installmentMode: validated.installmentMode ?? "AUTOMATICO",
          firstInstallmentAmount: validated.firstInstallmentAmount ?? null,
          regularInstallmentAmount: validated.regularInstallmentAmount ?? null,
          firstInstallmentMonth: validated.firstInstallmentMonth || null,
          collectionDay: validated.collectionDay ?? null,
          commissionAmount: validated.commissionAmount ?? null,
          exchangeRateOverride: validated.exchangeRateOverride ?? null,
          status: validated.status,
          cesionType: validated.status === "CESION" ? (validated.cesionType ?? null) : null,
          cesionDetail: validated.status === "CESION" ? (validated.cesionDetail || null) : null,
          notes: validated.notes || null,
          paymentWindow: validated.paymentWindow || null,
          createdById: userId,
        },
      });

      // 2. Generate installments
      if (
        validated.totalInstallments > 0 &&
        validated.firstInstallmentMonth &&
        validated.collectionDay
      ) {
        if (validated.installmentMode === "MANUAL" && validated.manualInstallments?.length) {
          // Manual mode: use individual amounts from manualInstallments array
          const installments = generateInstallments({
            saleId: sale.id,
            totalInstallments: validated.totalInstallments,
            regularInstallmentAmount: 0, // not used in manual mode
            firstInstallmentMonth: validated.firstInstallmentMonth,
            collectionDay: validated.collectionDay,
            currency: validated.currency,
            manualAmounts: validated.manualInstallments.map((i) => i.amount),
          });
          await tx.installment.createMany({ data: installments });
        } else if (validated.regularInstallmentAmount) {
          // Automatic mode: uniform or custom-first
          const installments = generateInstallments({
            saleId: sale.id,
            totalInstallments: validated.totalInstallments,
            regularInstallmentAmount: validated.regularInstallmentAmount,
            firstInstallmentAmount: validated.firstInstallmentAmount,
            firstInstallmentMonth: validated.firstInstallmentMonth,
            collectionDay: validated.collectionDay,
            currency: validated.currency,
          });
          await tx.installment.createMany({ data: installments });
        }
      }

      // 3. Create extra charges (refuerzos)
      if (
        validated.status === "ACTIVA" &&
        validated.extraCharges &&
        validated.extraCharges.length > 0
      ) {
        await tx.extraCharge.createMany({
          data: validated.extraCharges.map((ec) => ({
            saleId: sale.id,
            description: ec.description,
            amount: ec.amount,
            currency: validated.currency,
            dueDate: new Date(ec.dueDate),
            status: "PENDIENTE" as const,
            paidAmount: 0,
            isInKind: false,
            notes: ec.notes || null,
            createdById: userId,
          })),
        });
      }

      // 4. Update lot status
      await tx.lot.update({
        where: { id: validated.lotId },
        data: { status: lotStatus },
      });

      return sale.id;
    });

    await logAction(
      "Sale",
      saleId,
      "CREATE",
      {
        newData: {
          lotId: validated.lotId,
          personId: validated.personId,
          totalPrice: validated.totalPrice,
          status: validated.status,
          currency: validated.currency,
        },
      },
      userId
    );

    return saleId;
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        throw new ServiceError(
          "Ya existe una venta registrada para este lote. Si fue cancelada, debe eliminarse primero."
        );
      }
      if (error.code === "P2003") {
        throw new ServiceError(
          "Referencia invalida: verifique que el lote, persona y vendedor existan."
        );
      }
    }
    console.error("Error al crear venta:", error);
    throw new ServiceError("Error al crear la venta");
  }
}

// ---------------------------------------------------------------------------
// Create New Installment Plan (post-transfer renegotiation)
// ---------------------------------------------------------------------------

export async function createNewInstallmentPlan(
  data: {
    saleId: string;
    totalInstallments: number;
    installmentMode: string;
    firstInstallmentMonth: string;
    collectionDay: number;
    manualInstallments: Array<{ amount: number }>;
  },
  userId: string
): Promise<void> {
  const sale = await prisma.sale.findUnique({
    where: { id: data.saleId },
    include: {
      installments: {
        where: { status: { in: ["PENDIENTE", "VENCIDA", "PARCIAL"] } },
        select: { id: true },
      },
    },
  });

  if (!sale) throw new ServiceError("Venta no encontrada");
  if (sale.status !== "ACTIVA") {
    throw new ServiceError("Solo se pueden crear cuotas en ventas activas");
  }
  if (sale.installments.length > 0) {
    throw new ServiceError(
      "La venta ya tiene cuotas pendientes. Primero debe renegociar las existentes."
    );
  }

  // Calculate amount to finance: totalPrice - downPayment - paid installments
  const paidInstallments = await prisma.installment.aggregate({
    where: { saleId: data.saleId, status: "PAGADA" },
    _sum: { amount: true },
  });
  const paidExtraCharges = await prisma.extraCharge.aggregate({
    where: { saleId: data.saleId, status: "PAGADA" },
    _sum: { amount: true },
  });

  const totalPaid =
    Number(paidInstallments._sum.amount ?? 0) +
    Number(sale.downPayment ?? 0) +
    Number(paidExtraCharges._sum.amount ?? 0);
  const remaining = Number(sale.totalPrice) - totalPaid;

  if (remaining <= 0) {
    throw new ServiceError("No hay monto pendiente para financiar en cuotas");
  }

  // Get max installment number from existing (paid) installments
  const maxExisting = await prisma.installment.findFirst({
    where: { saleId: data.saleId },
    orderBy: { installmentNumber: "desc" },
    select: { installmentNumber: true },
  });
  const startNumber = (maxExisting?.installmentNumber ?? 0) + 1;

  let installmentAmounts: number[];

  if (data.installmentMode === "MANUAL") {
    if (data.manualInstallments.length !== data.totalInstallments) {
      throw new ServiceError(
        `Se esperan ${data.totalInstallments} cuotas pero se proporcionaron ${data.manualInstallments.length}`
      );
    }
    const manualTotal = data.manualInstallments.reduce((s, i) => s + i.amount, 0);
    if (Math.abs(manualTotal - remaining) > 0.02) {
      throw new ServiceError(
        `La suma de cuotas (${manualTotal.toFixed(2)}) no coincide con el saldo pendiente (${remaining.toFixed(2)})`
      );
    }
    installmentAmounts = data.manualInstallments.map((i) => i.amount);
  } else {
    const perInstallment = Math.round((remaining / data.totalInstallments) * 100) / 100;
    installmentAmounts = Array(data.totalInstallments).fill(perInstallment);
  }

  const installments = generateInstallments({
    saleId: data.saleId,
    totalInstallments: data.totalInstallments,
    regularInstallmentAmount: installmentAmounts[0],
    firstInstallmentMonth: data.firstInstallmentMonth,
    collectionDay: data.collectionDay,
    currency: sale.currency,
    manualAmounts: data.installmentMode === "MANUAL" ? installmentAmounts : undefined,
  });

  // Renumber starting from startNumber
  const renumbered = installments.map((inst, idx) => ({
    ...inst,
    installmentNumber: startNumber + idx,
  }));

  try {
    await prisma.$transaction(async (tx) => {
      await tx.installment.createMany({ data: renumbered });
      const totalCount = await tx.installment.count({
        where: { saleId: data.saleId },
      });
      await tx.sale.update({
        where: { id: data.saleId },
        data: {
          totalInstallments: totalCount,
          firstInstallmentMonth: data.firstInstallmentMonth,
          collectionDay: data.collectionDay,
          installmentMode: data.installmentMode as "AUTOMATICO" | "MANUAL",
          regularInstallmentAmount:
            data.installmentMode !== "MANUAL" ? installmentAmounts[0] : null,
        },
      });
    });

    await logAction(
      "Sale",
      data.saleId,
      "UPDATE",
      {
        newData: {
          action: "NUEVO_PLAN_CUOTAS",
          totalInstallments: data.totalInstallments,
          remaining,
        },
      },
      userId
    );
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    console.error("Error al crear plan de cuotas:", error);
    throw new ServiceError("Error al crear el plan de cuotas");
  }
}

// ---------------------------------------------------------------------------
// Cancel Sale
// ---------------------------------------------------------------------------

export async function cancelSale(id: string): Promise<void> {
  const sale = await saleModel.findById(id);
  if (!sale) throw new ServiceError("Venta no encontrada");
  if (sale.status !== "ACTIVA") {
    throw new ServiceError("Solo se pueden cancelar ventas activas");
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.sale.update({
        where: { id },
        data: { status: "CANCELADA" },
      });
      await tx.lot.update({
        where: { id: sale.lotId },
        data: { status: "DISPONIBLE" },
      });
    });

    await logAction("Sale", id, "UPDATE", {
      oldData: { status: "ACTIVA" },
      newData: { status: "CANCELADA" },
    });
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Error al cancelar la venta");
  }
}

// ---------------------------------------------------------------------------
// Serialization for client consumption
// ---------------------------------------------------------------------------

export function serializeSaleForClient(
  sale: NonNullable<Awaited<ReturnType<typeof saleModel.findById>>>
) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  function overdueStatus(status: string, dueDate: Date): string {
    if (
      (status === "PENDIENTE" || status === "PARCIAL") &&
      new Date(dueDate) < today
    ) {
      return "VENCIDA";
    }
    return status;
  }

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
    exchangeRateOverride: sale.exchangeRateOverride
      ? Number(sale.exchangeRateOverride)
      : null,
    lot: {
      ...sale.lot,
      area: sale.lot.area ? Number(sale.lot.area) : null,
      listPrice: sale.lot.listPrice ? Number(sale.lot.listPrice) : null,
    },
    installments: sale.installments.map((inst) => ({
      ...inst,
      amount: Number(inst.amount),
      originalAmount: inst.originalAmount
        ? Number(inst.originalAmount)
        : null,
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
