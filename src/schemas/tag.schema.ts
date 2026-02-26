import { z } from "zod";

function slugify(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export const tagCreateSchema = z.object({
  label: z
    .string()
    .min(1, "El nombre es requerido")
    .max(50, "Máximo 50 caracteres")
    .transform((v) => v.trim()),
  color: z
    .string()
    .regex(/^#[0-9A-Fa-f]{6}$/, "Formato de color inválido (ej: #FF5733)")
    .optional()
    .or(z.literal("")),
});

export const tagUpdateSchema = tagCreateSchema.extend({
  id: z.string().min(1),
});

export const lotTagsSchema = z.object({
  lotId: z.string().min(1, "El lote es requerido"),
  tagIds: z.array(z.string()),
});

export type TagCreateInput = z.input<typeof tagCreateSchema>;
export type TagUpdateInput = z.input<typeof tagUpdateSchema>;
export type LotTagsInput = z.infer<typeof lotTagsSchema>;

/** Generate a slug name from the label */
export function labelToName(label: string): string {
  return slugify(label);
}
