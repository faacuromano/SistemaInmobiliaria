import { prisma } from "@/lib/prisma";

export const tagModel = {
  async findAll() {
    return prisma.tag.findMany({
      include: { _count: { select: { lots: true } } },
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.tag.findUnique({
      where: { id },
      include: { _count: { select: { lots: true } } },
    });
  },

  async create(data: { name: string; label: string; color?: string | null }) {
    return prisma.tag.create({ data });
  },

  async update(id: string, data: { name?: string; label?: string; color?: string | null }) {
    return prisma.tag.update({ where: { id }, data });
  },

  async delete(id: string) {
    return prisma.tag.delete({ where: { id } });
  },

  async nameExists(name: string, excludeId?: string) {
    const tag = await prisma.tag.findUnique({ where: { name } });
    if (!tag) return false;
    return excludeId ? tag.id !== excludeId : true;
  },

  async findByLotId(lotId: string) {
    const lotTags = await prisma.lotTag.findMany({
      where: { lotId },
      include: { tag: true },
      orderBy: { tag: { name: "asc" } },
    });
    return lotTags.map((lt) => lt.tag);
  },

  async setLotTags(lotId: string, tagIds: string[]) {
    return prisma.$transaction(async (tx) => {
      await tx.lotTag.deleteMany({ where: { lotId } });

      if (tagIds.length > 0) {
        await tx.lotTag.createMany({
          data: tagIds.map((tagId) => ({ lotId, tagId })),
        });
      }

      return tx.lotTag.findMany({
        where: { lotId },
        include: { tag: true },
      });
    });
  },
};
