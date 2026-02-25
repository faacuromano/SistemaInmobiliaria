import { z } from "zod";

const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;

const timeStringSchema = z
  .string()
  .regex(timeRegex, "Formato HH:MM requerido");

const breakPeriodSchema = z
  .object({
    label: z.string().min(1, "Nombre requerido").max(50),
    startTime: timeStringSchema,
    endTime: timeStringSchema,
  })
  .refine((b) => b.startTime < b.endTime, {
    message: "El inicio del descanso debe ser anterior al fin",
    path: ["endTime"],
  });

export const businessHoursSchema = z
  .object({
    openingTime: timeStringSchema,
    closingTime: timeStringSchema,
    breaks: z.array(breakPeriodSchema).max(10, "Maximo 10 descansos"),
    enabledDays: z
      .array(z.number().int().min(0).max(6))
      .min(1, "Al menos un dia debe estar habilitado"),
  })
  .refine((data) => data.openingTime < data.closingTime, {
    message: "La hora de apertura debe ser anterior a la de cierre",
    path: ["closingTime"],
  })
  .refine(
    (data) =>
      data.breaks.every(
        (b) => b.startTime >= data.openingTime && b.endTime <= data.closingTime
      ),
    {
      message: "Los descansos deben estar dentro del horario laboral",
      path: ["breaks"],
    }
  )
  .refine(
    (data) => {
      const sorted = [...data.breaks].sort((a, b) =>
        a.startTime.localeCompare(b.startTime)
      );
      return sorted.every(
        (br, i) => i === 0 || sorted[i - 1].endTime <= br.startTime
      );
    },
    {
      message: "Los descansos no pueden superponerse",
      path: ["breaks"],
    }
  );

export type BusinessHoursInput = z.infer<typeof businessHoursSchema>;
