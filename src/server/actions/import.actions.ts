"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth-guard";
import * as importService from "@/server/services/import.service";
import type { ImportResult } from "@/server/services/import.service";

export async function importPersons(
  rawData: string,
  format: "json" | "csv" | "excel" = "json"
): Promise<ImportResult> {
  const session = await requirePermission("config:manage");
  const result = await importService.importPersons(rawData, format, session.user.id);
  revalidatePath("/personas");
  return result;
}

export async function importSales(
  rawData: string,
  format: "json" | "csv" | "excel" = "json"
): Promise<ImportResult> {
  const session = await requirePermission("config:manage");
  const result = await importService.importSales(rawData, format, session.user.id);
  revalidatePath("/ventas");
  revalidatePath("/desarrollos");
  return result;
}
