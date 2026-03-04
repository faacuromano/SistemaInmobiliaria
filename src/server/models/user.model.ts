import { prisma } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client/client";

interface FindAllParams {
  search?: string;
  role?: string;
  isActive?: boolean;
}

interface FindAllSellersParams {
  search?: string;
  isActive?: boolean;
}

export const userModel = {
  async findByEmail(email: string) {
    return prisma.user.findUnique({
      where: { email },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        password: true,
        role: true,
        isActive: true,
      },
    });
  },

  async findAll(params?: FindAllParams) {
    const where: Prisma.UserWhereInput = {};

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.role) where.role = params.role as Prisma.EnumRoleFilter;
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        isSeller: true,
        commissionRate: true,
        createdAt: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async findById(id: string) {
    return prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        name: true,
        lastName: true,
        role: true,
        isActive: true,
        phone: true,
        isSeller: true,
        commissionRate: true,
        createdAt: true,
      },
    });
  },

  async create(data: {
    email: string;
    password: string;
    name: string;
    lastName: string;
    role: string;
    phone?: string | null;
  }) {
    return prisma.user.create({ data: data as Prisma.UserCreateInput });
  },

  async update(
    id: string,
    data: {
      email?: string;
      name?: string;
      lastName?: string;
      role?: string;
      phone?: string | null;
    }
  ) {
    return prisma.user.update({
      where: { id },
      data: data as Prisma.UserUpdateInput,
    });
  },

  async updatePassword(id: string, hashedPassword: string) {
    return prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });
  },

  async toggleActive(id: string, isActive: boolean) {
    return prisma.user.update({ where: { id }, data: { isActive } });
  },

  // --- Seller-related methods ---

  async findAllSellers(params?: FindAllSellersParams) {
    const where: Prisma.UserWhereInput = { isSeller: true };

    if (params?.search) {
      where.OR = [
        { name: { contains: params.search, mode: "insensitive" } },
        { lastName: { contains: params.search, mode: "insensitive" } },
        { email: { contains: params.search, mode: "insensitive" } },
      ];
    }
    if (params?.isActive !== undefined) where.isActive = params.isActive;

    return prisma.user.findMany({
      where,
      select: {
        id: true,
        name: true,
        lastName: true,
        email: true,
        phone: true,
        isActive: true,
        commissionRate: true,
        createdAt: true,
        _count: { select: { sellerSales: true } },
      },
      orderBy: { name: "asc" },
    });
  },

  async findActiveSellers() {
    return prisma.user.findMany({
      where: { isSeller: true, isActive: true },
      select: {
        id: true,
        name: true,
        lastName: true,
        commissionRate: true,
      },
      orderBy: { name: "asc" },
    });
  },

  async toggleSeller(id: string, isSeller: boolean) {
    return prisma.user.update({
      where: { id },
      data: { isSeller },
    });
  },

  async updateCommissionRate(id: string, rate: number | null) {
    return prisma.user.update({
      where: { id },
      data: { commissionRate: rate },
    });
  },
};
