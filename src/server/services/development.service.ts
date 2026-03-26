import { prisma } from "@/lib/prisma";
import { logAction } from "@/lib/audit";
import { ServiceError } from "@/lib/service-error";
import { developmentModel } from "@/server/models/development.model";
import { slugify } from "@/lib/format";
import type { z } from "zod";
import type {
  developmentCreateSchema,
  developmentUpdateSchema,
} from "@/schemas/development.schema";

type DevCreateData = z.output<typeof developmentCreateSchema>;
type DevUpdateData = z.output<typeof developmentUpdateSchema>;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generateUniqueSlug(
  name: string,
  excludeId?: string
): Promise<string> {
  let slug = slugify(name);
  let counter = 0;
  while (await developmentModel.slugExists(slug, excludeId)) {
    counter++;
    slug = `${slugify(name)}-${counter}`;
  }
  return slug;
}

// ---------------------------------------------------------------------------
// Create Development (with auto-generated lots)
// ---------------------------------------------------------------------------

export async function createDevelopment(data: DevCreateData, userId: string): Promise<void> {
  const slug = await generateUniqueSlug(data.name);

  try {
    const development = await developmentModel.create({
      name: data.name,
      slug,
      description: data.description || null,
      location: data.location || null,
      googleMapsUrl: data.googleMapsUrl || null,
      type: data.type,
      status: data.status,
    });

    const totalLots = data.totalLots ?? 0;
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
      newData: {
        name: data.name,
        type: data.type,
        status: data.status,
        totalLots,
      },
    }, userId);
  } catch {
    throw new ServiceError("Error al crear el desarrollo");
  }
}

// ---------------------------------------------------------------------------
// Update Development (with slug regeneration)
// ---------------------------------------------------------------------------

export async function updateDevelopment(data: DevUpdateData, userId: string): Promise<void> {
  const existing = await developmentModel.findById(data.id);
  if (!existing) throw new ServiceError("Desarrollo no encontrado");

  const slug =
    existing.name !== data.name
      ? await generateUniqueSlug(data.name, data.id)
      : existing.slug;

  try {
    await developmentModel.update(data.id, {
      name: data.name,
      slug,
      description: data.description || null,
      location: data.location || null,
      googleMapsUrl: data.googleMapsUrl || null,
      type: data.type,
      status: data.status,
    });

    await logAction("Development", data.id, "UPDATE", {
      oldData: {
        name: existing.name,
        type: existing.type,
        status: existing.status,
      },
      newData: {
        name: data.name,
        type: data.type,
        status: data.status,
      },
    }, userId);
  } catch (error) {
    if (error instanceof ServiceError) throw error;
    throw new ServiceError("Error al actualizar el desarrollo");
  }
}

// ---------------------------------------------------------------------------
// Delete Development (with validation)
// ---------------------------------------------------------------------------

export async function deleteDevelopment(id: string, userId: string): Promise<void> {
  const development = await developmentModel.findById(id);
  if (!development) throw new ServiceError("Desarrollo no encontrado");

  const hasSales = await developmentModel.hasLotsWithSales(id);
  if (hasSales) {
    throw new ServiceError(
      "No se puede eliminar un desarrollo con lotes vendidos"
    );
  }

  await developmentModel.delete(id);

  await logAction("Development", id, "DELETE", {
    oldData: {
      name: development.name,
      lotsDeleted: development.lots.length,
    },
  }, userId);
}
