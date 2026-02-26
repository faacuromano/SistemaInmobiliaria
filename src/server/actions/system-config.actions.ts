"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import { systemConfigModel } from "@/server/models/system-config.model";
import { systemConfigSchema } from "@/schemas/system-config.schema";
import type { ActionResult } from "@/types/actions";

export async function getSystemConfig(): Promise<Record<string, string>> {
  await requirePermission("config:manage");
  return systemConfigModel.getAll();
}

export async function updateSystemConfig(
  _prevState: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  await requirePermission("config:manage");

  const raw = {
    company_name: formData.get("company_name"),
    company_cuit: formData.get("company_cuit"),
    company_address: formData.get("company_address"),
    company_phone: formData.get("company_phone"),
    company_email: formData.get("company_email"),
    receipt_header: formData.get("receipt_header"),
    receipt_footer: formData.get("receipt_footer"),
    default_exchange_source: formData.get("default_exchange_source"),
    // SMTP email settings
    smtp_host: formData.get("smtp_host"),
    smtp_port: formData.get("smtp_port"),
    smtp_user: formData.get("smtp_user"),
    smtp_pass: formData.get("smtp_pass"),
    smtp_from: formData.get("smtp_from"),
  };

  const parsed = systemConfigSchema.safeParse(raw);
  if (!parsed.success) {
    return { success: false, error: parsed.error.errors[0].message };
  }

  const entries = Object.entries(parsed.data) as [string, string | undefined][];

  for (const [key, value] of entries) {
    if (value && value.trim() !== "") {
      await systemConfigModel.set(key, value.trim());
    } else {
      await systemConfigModel.delete(key);
    }
  }

  revalidatePath("/configuracion");
  return { success: true };
}
