"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { tagModel } from "@/server/models/tag.model";
import { tagCreateSchema, tagUpdateSchema, lotTagsSchema, labelToName } from "@/schemas/tag.schema";
import type { ActionResult } from "@/types/actions";

export async function getTags() {
  await requirePermission("lots:view");
  return tagModel.findAll();
}

export async function createTag(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("lots:manage");

  const raw = {
    label: formData.get("label"),
    color: formData.get("color"),
  };

  const parsed = tagCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const name = labelToName(parsed.data.label);
  if (!name) {
    return { success: false, error: "El nombre generado es inválido" };
  }

  const exists = await tagModel.nameExists(name);
  if (exists) {
    return { success: false, error: "Ya existe una etiqueta con ese nombre" };
  }

  await tagModel.create({
    name,
    label: parsed.data.label,
    color: parsed.data.color || null,
  });

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function updateTag(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("lots:manage");

  const raw = {
    id,
    label: formData.get("label"),
    color: formData.get("color"),
  };

  const parsed = tagUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const name = labelToName(parsed.data.label);
  if (!name) {
    return { success: false, error: "El nombre generado es inválido" };
  }

  const exists = await tagModel.nameExists(name, id);
  if (exists) {
    return { success: false, error: "Ya existe una etiqueta con ese nombre" };
  }

  await tagModel.update(id, {
    name,
    label: parsed.data.label,
    color: parsed.data.color || null,
  });

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function deleteTag(id: string): Promise<ActionResult> {
  await requirePermission("lots:manage");

  const tag = await tagModel.findById(id);
  if (!tag) {
    return { success: false, error: "Etiqueta no encontrada" };
  }

  await tagModel.delete(id);
  revalidatePath("/desarrollos");
  return { success: true };
}

export async function getTagsForLot(lotId: string) {
  await requirePermission("lots:view");
  return tagModel.findByLotId(lotId);
}

export async function bulkSetLotTags(
  lotIds: string[],
  tagIds: string[]
): Promise<ActionResult> {
  await requirePermission("lots:manage");

  if (lotIds.length === 0) {
    return { success: false, error: "No se seleccionaron lotes" };
  }
  if (lotIds.length > 200) {
    return { success: false, error: "Maximo 200 lotes por operacion" };
  }

  for (const lotId of lotIds) {
    await tagModel.setLotTags(lotId, tagIds);
  }

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function setLotTags(lotId: string, tagIds: string[]): Promise<ActionResult> {
  await requirePermission("lots:manage");

  const parsed = lotTagsSchema.safeParse({ lotId, tagIds });
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  await tagModel.setLotTags(parsed.data.lotId, parsed.data.tagIds);

  revalidatePath("/desarrollos");
  return { success: true };
}
