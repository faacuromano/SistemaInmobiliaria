import { prisma } from "@/lib/prisma";

export const systemConfigModel = {
  async get(key: string): Promise<string | null> {
    const config = await prisma.systemConfig.findUnique({ where: { key } });
    return config?.value ?? null;
  },

  async set(key: string, value: string): Promise<void> {
    await prisma.systemConfig.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  },

  async getAll(): Promise<Record<string, string>> {
    const configs = await prisma.systemConfig.findMany();
    return Object.fromEntries(configs.map((c) => [c.key, c.value]));
  },

  async getMany(keys: string[]): Promise<Record<string, string>> {
    const configs = await prisma.systemConfig.findMany({
      where: { key: { in: keys } },
    });
    return Object.fromEntries(configs.map((c) => [c.key, c.value]));
  },

  async delete(key: string): Promise<void> {
    await prisma.systemConfig.deleteMany({ where: { key } });
  },
};
