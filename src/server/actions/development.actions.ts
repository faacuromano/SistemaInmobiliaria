"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { developmentModel } from "@/server/models/development.model";
import {
  developmentCreateSchema,
  developmentUpdateSchema,
} from "@/schemas/development.schema";
import { slugify } from "@/lib/format";
import { logAction } from "@/server/actions/audit-log.actions";
import type { ActionResult } from "@/types/actions";
import type { DevelopmentStatus, DevelopmentType } from "@/generated/prisma/client/client";

export async function getDevelopments(params?: {
  search?: string;
  status?: DevelopmentStatus;
  type?: DevelopmentType;
}) {
  await requirePermission("developments:view");
  return developmentModel.findAll(params);
}

export async function getDevelopmentBySlug(slug: string) {
  await requirePermission("developments:view");
  return developmentModel.findBySlug(slug);
}

async function generateUniqueSlug(name: string, excludeId?: string): Promise<string> {
  let slug = slugify(name);
  let counter = 0;
  while (await developmentModel.slugExists(slug, excludeId)) {
    counter++;
    slug = `${slugify(name)}-${counter}`;
  }
  return slug;
}

export async function createDevelopment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("developments:manage");

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

  const slug = await generateUniqueSlug(parsed.data.name);

  try {
    const development = await developmentModel.create({
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      googleMapsUrl: parsed.data.googleMapsUrl || null,
      type: parsed.data.type,
      status: parsed.data.status,
    });

    const totalLots = parsed.data.totalLots ?? 0;
    if (totalLots > 0) {
      await prisma.lot.createMany({
        data: Array.from({ length: totalLots }, (_, i) => ({
          developmentId: development.id,
          lotNumber: String(i + 1),
          status: "DISPONIBLE" as const,
        })),
      });
    }

    await logAction("Development", development.id, "CREATE", {
      newData: { name: parsed.data.name, type: parsed.data.type, status: parsed.data.status, totalLots },
    });
  } catch {
    return { success: false, error: "Error al crear el desarrollo" };
  }

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function updateDevelopment(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("developments:manage");

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

  // Regenerate slug if name changed
  const existing = await developmentModel.findById(parsed.data.id);
  if (!existing) return { success: false, error: "Desarrollo no encontrado" };

  const slug = existing.name !== parsed.data.name
    ? await generateUniqueSlug(parsed.data.name, parsed.data.id)
    : existing.slug;

  try {
    await developmentModel.update(parsed.data.id, {
      name: parsed.data.name,
      slug,
      description: parsed.data.description || null,
      location: parsed.data.location || null,
      googleMapsUrl: parsed.data.googleMapsUrl || null,
      type: parsed.data.type,
      status: parsed.data.status,
    });

    await logAction("Development", parsed.data.id, "UPDATE", {
      oldData: { name: existing.name, type: existing.type, status: existing.status },
      newData: { name: parsed.data.name, type: parsed.data.type, status: parsed.data.status },
    });
  } catch {
    return { success: false, error: "Error al actualizar el desarrollo" };
  }

  revalidatePath("/desarrollos");
  return { success: true };
}

export async function deleteDevelopment(id: string): Promise<ActionResult> {
  await requirePermission("developments:manage");

  const development = await developmentModel.findById(id);
  if (!development) return { success: false, error: "Desarrollo no encontrado" };

  if (development.lots.length > 0) {
    const hasSales = await developmentModel.hasLotsWithSales(id);
    if (hasSales) {
      return { success: false, error: "No se puede eliminar un desarrollo con lotes vendidos" };
    }
    return { success: false, error: "Eliminá todos los lotes antes de eliminar el desarrollo" };
  }

  await developmentModel.delete(id);

  await logAction("Development", id, "DELETE", {
    oldData: { name: development.name },
  });

  revalidatePath("/desarrollos");
  return { success: true };
}
