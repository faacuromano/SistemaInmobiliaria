import { z } from "zod";
import { LotStatus } from "@/types/enums";

export const lotCreateSchema = z.object({
  developmentId: z.string().min(1, "El desarrollo es requerido"),
  lotNumber: z.string().min(1, "El número de lote es requerido"),
  block: z.string().optional().or(z.literal("")),
  area: z.string().optional().or(z.literal("")).transform((v) => (v ? parseFloat(v) : undefined)).pipe(z.number().finite().positive().optional()),
  listPrice: z.string().optional().or(z.literal("")).transform((v) => (v ? parseFloat(v) : undefined)).pipe(z.number().finite().nonnegative().optional()),
  status: z.nativeEnum(LotStatus).default(LotStatus.DISPONIBLE),
  notes: z.string().optional().or(z.literal("")),
});

export const lotUpdateSchema = lotCreateSchema.extend({
  id: z.string().min(1),
});

// z.input for form components (pre-transform: string fields)
export type LotCreateInput = z.input<typeof lotCreateSchema>;
export type LotUpdateInput = z.input<typeof lotUpdateSchema>;
// z.output for server-side use (post-transform: number fields)
export type LotCreateData = z.output<typeof lotCreateSchema>;
export type LotUpdateData = z.output<typeof lotUpdateSchema>;
