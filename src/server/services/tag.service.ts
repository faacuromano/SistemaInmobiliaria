import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { tagModel } from "@/server/models/tag.model";
import { labelToName } from "@/schemas/tag.schema";

export async function createTag(
  label: string,
  color: string | null,
  userId: string
): Promise<void> {
  const name = labelToName(label);
  if (!name) {
    throw new ServiceError("El nombre generado es inválido");
  }

  const exists = await tagModel.nameExists(name);
  if (exists) {
    throw new ServiceError("Ya existe una etiqueta con ese nombre");
  }

  const tag = await tagModel.create({
    name,
    label,
    color: color || null,
  });

  await logAction("Tag", tag.id, "CREATE", {
    newData: { name, label },
  }, userId);
}

export async function updateTag(
  id: string,
  label: string,
  color: string | null,
  userId: string
): Promise<void> {
  const name = labelToName(label);
  if (!name) {
    throw new ServiceError("El nombre generado es inválido");
  }

  const exists = await tagModel.nameExists(name, id);
  if (exists) {
    throw new ServiceError("Ya existe una etiqueta con ese nombre");
  }

  await tagModel.update(id, {
    name,
    label,
    color: color || null,
  });

  await logAction("Tag", id, "UPDATE", {
    newData: { name, label },
  }, userId);
}

export async function deleteTag(id: string, userId: string): Promise<void> {
  const tag = await tagModel.findById(id);
  if (!tag) {
    throw new ServiceError("Etiqueta no encontrada");
  }

  await tagModel.delete(id);

  await logAction("Tag", id, "DELETE", {
    oldData: { name: tag.name, label: tag.label },
  }, userId);
}

export async function bulkSetLotTags(
  lotIds: string[],
  tagIds: string[]
): Promise<void> {
  if (lotIds.length === 0) {
    throw new ServiceError("No se seleccionaron lotes");
  }
  if (lotIds.length > 200) {
    throw new ServiceError("Maximo 200 lotes por operacion");
  }

  for (const lotId of lotIds) {
    await tagModel.setLotTags(lotId, tagIds);
  }
}
