import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { signingModel } from "@/server/models/signing.model";
import type { SigningStatus } from "@/types/enums";

// ---------------------------------------------------------------------------
// Create
// ---------------------------------------------------------------------------

interface CreateSigningData {
  date: Date;
  time: string;
  endTime?: string | null;
  lotInfo: string;
  clientName?: string | null;
  lotNumbers?: string | null;
  developmentId?: string | null;
  sellerId?: string | null;
  notes?: string | null;
  saleId?: string | null;
}

export async function createSigning(
  data: CreateSigningData,
  userId: string
) {
  const signing = await signingModel.create({
    date: data.date,
    time: data.time,
    endTime: data.endTime || null,
    lotInfo: data.lotInfo,
    clientName: data.clientName || null,
    lotNumbers: data.lotNumbers || null,
    developmentId: data.developmentId || null,
    sellerId: data.sellerId || null,
    notes: data.notes || null,
    createdById: userId,
    saleId: data.saleId || null,
  });

  await logAction("SigningSlot", signing.id, "CREATE", {
    newData: { date: data.date, time: data.time, lotInfo: data.lotInfo, saleId: data.saleId },
  }, userId);

  return signing;
}

// ---------------------------------------------------------------------------
// Update
// ---------------------------------------------------------------------------

interface UpdateSigningData {
  date: Date;
  time: string;
  endTime?: string | null;
  lotInfo: string;
  clientName?: string | null;
  lotNumbers?: string | null;
  developmentId?: string | null;
  sellerId?: string | null;
  notes?: string | null;
  saleId?: string | null;
  status?: string;
}

export async function updateSigning(
  id: string,
  data: UpdateSigningData,
  userId: string
): Promise<void> {
  await signingModel.update(id, {
    date: data.date,
    time: data.time,
    endTime: data.endTime || null,
    lotInfo: data.lotInfo,
    clientName: data.clientName || null,
    lotNumbers: data.lotNumbers || null,
    developmentId: data.developmentId || null,
    sellerId: data.sellerId || null,
    notes: data.notes || null,
    saleId: data.saleId || null,
    status: data.status,
  });

  await logAction("SigningSlot", id, "UPDATE", {
    newData: { date: data.date, time: data.time, lotInfo: data.lotInfo, status: data.status },
  }, userId);
}

// ---------------------------------------------------------------------------
// Update Status (with COMPLETADA special handling)
// ---------------------------------------------------------------------------

export async function updateSigningStatus(
  id: string,
  status: SigningStatus,
  userId: string
): Promise<void> {
  const signing = await signingModel.findById(id);
  if (!signing) throw new ServiceError("Turno de firma no encontrado");

  if (status === "COMPLETADA") {
    await completeSigningSlot({ signingId: id, userId });
  } else {
    await signingModel.updateStatus(id, status);
    await logAction("SigningSlot", id, "UPDATE", {
      oldData: { status: signing.status },
      newData: { status },
    }, userId);
  }
}

// ---------------------------------------------------------------------------
// Delete
// ---------------------------------------------------------------------------

export async function deleteSigning(id: string, userId: string): Promise<void> {
  const signing = await signingModel.findById(id);
  if (!signing) throw new ServiceError("Turno de firma no encontrado");

  await signingModel.delete(id);

  await logAction("SigningSlot", id, "DELETE", {
    oldData: { lotInfo: signing.lotInfo, date: signing.date, time: signing.time },
  }, userId);
}

// ---------------------------------------------------------------------------
// Link/Unlink Sale
// ---------------------------------------------------------------------------

export async function linkSigningToSale(
  signingId: string,
  saleId: string,
  userId: string
): Promise<void> {
  const signing = await signingModel.findById(signingId);
  if (!signing) throw new ServiceError("Turno de firma no encontrado");

  await signingModel.update(signingId, { saleId });

  await logAction("SigningSlot", signingId, "UPDATE", {
    oldData: { saleId: signing.saleId },
    newData: { saleId },
  }, userId);
}

export async function unlinkSigningFromSale(
  signingId: string,
  userId: string
): Promise<void> {
  const signing = await signingModel.findById(signingId);
  if (!signing) throw new ServiceError("Turno de firma no encontrado");

  await signingModel.update(signingId, { saleId: null });

  await logAction("SigningSlot", signingId, "UPDATE", {
    oldData: { saleId: signing.saleId },
    newData: { saleId: null },
  }, userId);
}

// ---------------------------------------------------------------------------
// Unlinked signings query
// ---------------------------------------------------------------------------

export async function getUnlinkedSignings(developmentId: string) {
  return signingModel.findAll({
    developmentId,
  }).then((signings) =>
    signings
      .filter((s) => !s.sale)
      .map((s) => ({
        id: s.id,
        clientName: s.clientName,
        lotInfo: s.lotInfo,
        date: s.date,
        time: s.time,
        status: s.status,
      }))
  );
}

// ---------------------------------------------------------------------------
// Complete Signing (atomic status + commission creation)
// ---------------------------------------------------------------------------

interface CompleteSigningParams {
  signingId: string;
  userId: string;
}

async function completeSigningSlot(params: CompleteSigningParams): Promise<void> {
  const { signingId, userId } = params;

  await prisma.$transaction(async (tx) => {
    const signing = await tx.signingSlot.findUnique({
      where: { id: signingId },
      include: {
        sale: {
          select: {
            id: true,
            sellerId: true,
            currency: true,
            commissionAmount: true,
            lot: {
              select: {
                lotNumber: true,
                developmentId: true,
              },
            },
            seller: {
              select: { name: true, lastName: true },
            },
          },
        },
      },
    });

    if (!signing) throw new ServiceError("Turno de firma no encontrado");

    await tx.signingSlot.update({
      where: { id: signingId },
      data: { status: "COMPLETADA" },
    });

    if (!signing.sale) return;

    const sale = signing.sale;
    const commissionAmount = sale.commissionAmount ? Number(sale.commissionAmount) : 0;

    if (commissionAmount <= 0) return;

    const existingCommission = await tx.cashMovement.findFirst({
      where: {
        type: "COMISION",
        saleId: sale.id,
      },
      select: { id: true },
    });

    if (existingCommission) return;

    const isUSD = sale.currency === "USD";
    const sellerName = sale.seller
      ? `${sale.seller.name} ${sale.seller.lastName}`.trim()
      : "Sin vendedor";

    await tx.cashMovement.create({
      data: {
        saleId: sale.id,
        personId: null,
        developmentId: sale.lot.developmentId,
        date: new Date(),
        type: "COMISION",
        concept: `COMISION - LOTE ${sale.lot.lotNumber}`,
        detail: null,
        usdIncome: null,
        arsIncome: null,
        usdExpense: isUSD ? commissionAmount : null,
        arsExpense: !isUSD ? commissionAmount : null,
        manualRate: null,
        registeredById: userId,
        notes: sale.sellerId
          ? `Vendedor: ${sellerName} (${sale.sellerId})`
          : null,
      },
    });
  });

  await logAction(
    "SigningSlot",
    signingId,
    "UPDATE",
    { newData: { status: "COMPLETADA", action: "AUTO_COMISION" } },
    userId
  );
}
