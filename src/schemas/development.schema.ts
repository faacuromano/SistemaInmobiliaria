import { z } from "zod";
import { DevelopmentStatus, DevelopmentType } from "@/types/enums";

export const developmentCreateSchema = z.object({
  name: z.string().min(1, "El nombre es requerido").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  location: z.string().max(200).optional().or(z.literal("")),
  googleMapsUrl: z.string().url("Debe ser una URL valida").max(500).optional().or(z.literal("")),
  type: z.nativeEnum(DevelopmentType),
  status: z.nativeEnum(DevelopmentStatus),
  totalLots: z.coerce
    .number()
    .int("Debe ser un número entero")
    .min(0, "Mínimo 0")
    .max(500, "Máximo 500 lotes")
    .optional()
    .default(0),
});

export const developmentUpdateSchema = developmentCreateSchema
  .omit({ totalLots: true })
  .extend({
    id: z.string().min(1),
  });

export type DevelopmentCreateInput = z.infer<typeof developmentCreateSchema>;
export type DevelopmentUpdateInput = z.infer<typeof developmentUpdateSchema>;
