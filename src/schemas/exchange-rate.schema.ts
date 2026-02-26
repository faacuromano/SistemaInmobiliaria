import { z } from "zod";

export const manualExchangeRateSchema = z.object({
  date: z.string().min(1, "La fecha es requerida"),
  officialBuy: z.coerce.number().positive().optional().nullable(),
  officialSell: z.coerce.number().positive().optional().nullable(),
  blueBuy: z.coerce.number().positive().optional().nullable(),
  blueSell: z.coerce.number().positive().optional().nullable(),
  cryptoBuy: z.coerce.number().positive().optional().nullable(),
  cryptoSell: z.coerce.number().positive().optional().nullable(),
});

export type ManualExchangeRateInput = z.infer<typeof manualExchangeRateSchema>;
