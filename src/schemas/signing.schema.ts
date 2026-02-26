import { z } from "zod";
import { SigningStatus } from "@/types/enums";

export const signingCreateSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  time: z
    .string()
    .min(1, "La hora es requerida")
    .regex(/^\d{2}:\d{2}$/, "Formato HH:MM"),
  endTime: z
    .string()
    .optional()
    .or(z.literal(""))
    .refine((v) => !v || /^\d{2}:\d{2}$/.test(v), "Formato HH:MM"),
  lotInfo: z.string().min(1, "La info del lote es requerida").max(200),
  clientName: z.string().max(200).optional().or(z.literal("")),
  lotNumbers: z.string().max(200).optional().or(z.literal("")),
  developmentId: z.string().optional().or(z.literal("")),
  sellerId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const signingUpdateSchema = signingCreateSchema.extend({
  id: z.string().min(1),
  status: z.nativeEnum(SigningStatus).optional(),
});

export type SigningCreateInput = z.input<typeof signingCreateSchema>;
export type SigningUpdateInput = z.input<typeof signingUpdateSchema>;
