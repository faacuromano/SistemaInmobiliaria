"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { systemConfigModel } from "@/server/models/system-config.model";
import { businessHoursSchema } from "@/schemas/business-hours.schema";
import {
  DEFAULT_BUSINESS_HOURS,
  type BusinessHoursConfig,
} from "@/lib/business-hours";
import type { ActionResult } from "@/types/actions";

const CONFIG_KEY = "business_hours";

export async function getBusinessHours(): Promise<BusinessHoursConfig> {
  const raw = await systemConfigModel.get(CONFIG_KEY);

  if (!raw) {
    return DEFAULT_BUSINESS_HOURS;
  }

  try {
    const parsed = JSON.parse(raw);
    const result = businessHoursSchema.safeParse(parsed);

    if (result.success) {
      return result.data;
    }

    // Partial/corrupted data: best-effort merge with defaults
    return { ...DEFAULT_BUSINESS_HOURS, ...parsed };
  } catch {
    // JSON.parse failed: return defaults
    return DEFAULT_BUSINESS_HOURS;
  }
}

export async function updateBusinessHours(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("config:manage");

  const jsonStr = formData.get("business_hours_json");
  if (typeof jsonStr !== "string") {
    return { success: false, error: "Datos invalidos" };
  }

  try {
    const data = JSON.parse(jsonStr);
    const parsed = businessHoursSchema.safeParse(data);

    if (!parsed.success) {
      return { success: false, error: parsed.error.errors[0].message };
    }

    await systemConfigModel.set(CONFIG_KEY, JSON.stringify(parsed.data));

    revalidatePath("/configuracion");
    revalidatePath("/firmas");

    return { success: true };
  } catch {
    return { success: false, error: "Error al procesar la configuracion" };
  }
}
