"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { tagModel } from "@/server/models/tag.model";
import { tagCreateSchema, tagUpdateSchema, lotTagsSchema } from "@/schemas/tag.schema";
import * as tagService from "@/server/services/tag.service";
import type { ActionResult } from "@/types/actions";

export async function getTags() {
  await requirePermission("lots:view");
  return tagModel.findAll();
}

export async function createTag(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  const raw = {
    label: formData.get("label"),
    color: formData.get("color"),
  };

  const parsed = tagCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await tagService.createTag(parsed.data.label, parsed.data.color || null, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear la etiqueta" };
  }
}

export async function updateTag(
  id: string,
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  const raw = {
    id,
    label: formData.get("label"),
    color: formData.get("color"),
  };

  const parsed = tagUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await tagService.updateTag(id, parsed.data.label, parsed.data.color || null, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar la etiqueta" };
  }
}

export async function deleteTag(id: string): Promise<ActionResult> {
  const session = await requirePermission("lots:manage");

  try {
    await tagService.deleteTag(id, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar la etiqueta" };
  }
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

  try {
    await tagService.bulkSetLotTags(lotIds, tagIds);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al asignar etiquetas" };
  }
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
