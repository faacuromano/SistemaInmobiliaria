import { prisma } from "@/lib/prisma";
import { Prisma, type PersonType } from "@/generated/prisma/client/client";

interface FindAllParams {
  search?: string;
  type?: PersonType;
  isActive?: boolean;
}

export const personModel = {
  async findAll(params?: FindAllParams) {
    const where: Prisma.PersonWhereInput = {};

    if (params?.search) {
      where.OR = [
        { firstName: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { dni: { contains: params.search, mode: "insensitive" } },
        { cuit: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.type) where.type = params.type;
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    return prisma.person.findMany({
      where,
      include: { _count: { select: { sales: true } } },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    });
  },

  async findById(id: string) {
    return prisma.person.findUnique({
      where: { id },
      include: {
        sales: {
          include: {
            lot: {
              include: { development: { select: { name: true } } },
            },
            installments: {
              orderBy: { dueDate: "asc" },
            },
            extraCharges: {
              orderBy: { dueDate: "asc" },
            },
          },
          orderBy: { saleDate: "desc" },
        },
        cashMovements: {
          orderBy: { date: "desc" },
          take: 50,
        },
      },
    });
  },

  async create(data: {
    type: PersonType;
    firstName: string;
    lastName: string;
    dni?: string | null;
    cuit?: string | null;
    email?: string | null;
    phone?: string | null;
    phone2?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    notes?: string | null;
    createdById: string;
  }) {
    return prisma.person.create({ data });
  },

  async update(id: string, data: {
    type?: PersonType;
    firstName?: string;
    lastName?: string;
    dni?: string | null;
    cuit?: string | null;
    email?: string | null;
    phone?: string | null;
    phone2?: string | null;
    address?: string | null;
    city?: string | null;
    province?: string | null;
    notes?: string | null;
  }) {
    return prisma.person.update({ where: { id }, data });
  },

  async toggleActive(id: string, isActive: boolean) {
    return prisma.person.update({ where: { id }, data: { isActive } });
  },

  async findForCollection(search: string) {
    const words = search.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) return [];

    const andConditions = words.map((word) => ({
      OR: [
        { firstName: { contains: word, mode: "insensitive" as const } },
        { lastName: { contains: word, mode: "insensitive" as const } },
        { dni: { contains: word, mode: "insensitive" as const } },
        { cuit: { contains: word, mode: "insensitive" as const } },
      ],
    }));

    return prisma.person.findMany({
      where: {
        isActive: true,
        AND: andConditions,
      },
      include: {
        sales: {
          where: { status: "ACTIVA" },
          include: {
            lot: {
              include: {
                development: { select: { name: true } },
              },
            },
            installments: {
              where: {
                status: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
              },
              orderBy: { installmentNumber: "asc" },
            },
            extraCharges: {
              where: {
                status: { in: ["PENDIENTE", "PARCIAL", "VENCIDA"] },
              },
              orderBy: { dueDate: "asc" },
            },
          },
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
      take: 20,
    });
  },
};
