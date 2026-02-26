import { z } from "zod";
import { LotStatus } from "@/types/enums";

export const lotCreateSchema = z.object({
  developmentId: z.string().min(1, "El desarrollo es requerido"),
  lotNumber: z.string().min(1, "El número de lote es requerido"),
  block: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")).transform((v) => (v ? parseFloat(v) : undefined)),
  listPrice: z.string().optional().or(z.literal("")).transform((v) => (v ? parseFloat(v) : undefined)),
  status: z.nativeEnum(LotStatus).default(LotStatus.DISPONIBLE),
  notes: z.string().optional().or(z.literal("")),
});

export const lotUpdateSchema = lotCreateSchema.extend({
  id: z.string().min(1),
});

export type LotCreateInput = z.input<typeof lotCreateSchema>;
export type LotUpdateInput = z.input<typeof lotUpdateSchema>;
