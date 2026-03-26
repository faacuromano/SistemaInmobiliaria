import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { lotModel } from "@/server/models/lot.model";
import type { LotStatus } from "@/generated/prisma/client/client";
import type { z } from "zod";
import type { lotCreateSchema, lotUpdateSchema } from "@/schemas/lot.schema";

type LotCreateData = z.output<typeof lotCreateSchema>;
type LotUpdateData = z.output<typeof lotUpdateSchema>;

export async function createLot(
  data: LotCreateData,
  userId: string
): Promise<void> {
  const exists = await lotModel.lotNumberExists(data.developmentId, data.lotNumber);
  if (exists) {
    throw new ServiceError("Ya existe un lote con ese número en este desarrollo");
  }

  const lot = await lotModel.create({
    developmentId: data.developmentId,
    lotNumber: data.lotNumber,
    block: data.block || null,
    area: data.area ?? null,
    listPrice: data.listPrice ?? null,
    status: data.status,
    notes: data.notes || null,
  });

  await logAction("Lot", lot.id, "CREATE", {
    newData: { lotNumber: data.lotNumber, developmentId: data.developmentId, status: data.status },
  }, userId);
}

export async function updateLot(
  data: LotUpdateData,
  userId: string
): Promise<void> {
  const exists = await lotModel.lotNumberExists(
    data.developmentId,
    data.lotNumber,
    data.id
  );
  if (exists) {
    throw new ServiceError("Ya existe un lote con ese número en este desarrollo");
  }

  await lotModel.update(data.id, {
    lotNumber: data.lotNumber,
    block: data.block || null,
    area: data.area ?? null,
    listPrice: data.listPrice ?? null,
    status: data.status,
    notes: data.notes || null,
  });

  await logAction("Lot", data.id, "UPDATE", {
    newData: { lotNumber: data.lotNumber, status: data.status },
  }, userId);
}

export async function bulkUpdateLotStatus(
  lotIds: string[],
  status: LotStatus,
  userId: string
): Promise<void> {
  if (lotIds.length === 0) {
    throw new ServiceError("No se seleccionaron lotes");
  }
  if (lotIds.length > 200) {
    throw new ServiceError("Maximo 200 lotes por operacion");
  }

  const lotsWithSales = await lotModel.countWithSales(lotIds);
  if (lotsWithSales > 0) {
    throw new ServiceError(
      `${lotsWithSales} lote(s) tienen venta asociada y no se pueden modificar en bloque`
    );
  }

  await lotModel.bulkUpdateStatus(lotIds, status);

  await logAction("Lot", lotIds.join(","), "BULK_UPDATE", {
    newData: { status, count: lotIds.length },
  }, userId);
}

export async function deleteLot(id: string, userId: string): Promise<void> {
  const hasSale = await lotModel.hasSale(id);
  if (hasSale) {
    throw new ServiceError("No se puede eliminar un lote con venta asociada");
  }

  await lotModel.delete(id);

  await logAction("Lot", id, "DELETE", undefined, userId);
}
