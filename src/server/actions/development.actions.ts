"use server";

import { revalidatePath } from "next/cache";
import { requireAuth, requirePermission } from "@/lib/auth-guard";
import { ServiceError } from "@/lib/service-error";
import { developmentModel } from "@/server/models/development.model";
import {
  developmentCreateSchema,
  developmentUpdateSchema,
} from "@/schemas/development.schema";
import * as developmentService from "@/server/services/development.service";
import type { ActionResult } from "@/types/actions";
import type {
  DevelopmentStatus,
  DevelopmentType,
} from "@/generated/prisma/client/client";

export async function getDevelopments(params?: {
  search?: string;
  status?: DevelopmentStatus;
  type?: DevelopmentType;
}) {
  await requirePermission("developments:view");
  return developmentModel.findAll(params);
}

export async function getDevelopmentOptions() {
  await requireAuth();
  return developmentModel.findOptions();
}

export async function getDevelopmentBySlug(slug: string) {
  await requirePermission("developments:view");
  return developmentModel.findBySlug(slug);
}

export async function createDevelopment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("developments:manage");

  const raw = {
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    googleMapsUrl: formData.get("googleMapsUrl"),
    type: formData.get("type"),
    status: formData.get("status"),
    totalLots: formData.get("totalLots"),
  };

  const parsed = developmentCreateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await developmentService.createDevelopment(parsed.data, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al crear el desarrollo" };
  }
}

export async function updateDevelopment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const session = await requirePermission("developments:manage");

  const raw = {
    id: formData.get("id"),
    name: formData.get("name"),
    description: formData.get("description"),
    location: formData.get("location"),
    googleMapsUrl: formData.get("googleMapsUrl"),
    type: formData.get("type"),
    status: formData.get("status"),
  };

  const parsed = developmentUpdateSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  try {
    await developmentService.updateDevelopment(parsed.data, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al actualizar el desarrollo" };
  }
}

export async function deleteDevelopment(id: string): Promise<ActionResult> {
  const session = await requirePermission("developments:manage");

  try {
    await developmentService.deleteDevelopment(id, session.user.id);
    revalidatePath("/desarrollos");
    return { success: true };
  } catch (error) {
    if (error instanceof ServiceError) {
      return { success: false, error: error.message };
    }
    return { success: false, error: "Error al eliminar el desarrollo" };
  }
}
