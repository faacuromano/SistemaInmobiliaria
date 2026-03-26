import { prisma } from "@/lib/prisma";
import { generateInstallments } from "@/lib/installment-generator";
import { logAction } from "@/lib/audit";
import { z } from "zod";
import Papa from "papaparse";
import * as XLSX from "xlsx";

// ============================================================================
// TYPES
// ============================================================================

export interface ImportResult {
  created: number;
  skipped: number;
  errors: string[];
  details: string[];
}

// ============================================================================
// VALIDATION SCHEMAS
// ============================================================================

const personImportSchema = z.object({
  firstName: z.string().min(1, "Nombre es requerido"),
  lastName: z.string().min(1, "Apellido es requerido"),
  dni: z.string().optional().nullable(),
  cuit: z.string().optional().nullable(),
  email: z.string().optional().nullable(),
  phone: z.string().optional().nullable(),
  phone2: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  province: z.string().optional().nullable(),
  type: z.enum(["CLIENTE", "PROVEEDOR", "AMBOS"]).default("CLIENTE"),
  notes: z.string().optional().nullable(),
});

const saleImportSchema = z.object({
  lotNumber: z.string().min(1, "Numero de lote es requerido"),
  developmentSlug: z.string().min(1, "Slug del desarrollo es requerido"),
  personDni: z.string().min(1, "DNI del comprador es requerido"),
  totalPrice: z.number().min(0, "El precio debe ser >= 0"),
  currency: z.enum(["USD", "ARS"]).default("USD"),
  totalInstallments: z.number().int().min(0, "Las cuotas deben ser >= 0"),
  regularInstallmentAmount: z.number().optional().nullable(),
  firstInstallmentAmount: z.number().optional().nullable(),
  firstInstallmentMonth: z.string().optional().nullable(),
  collectionDay: z.number().int().min(1).max(31).optional().nullable(),
  downPayment: z.number().optional().nullable(),
  status: z
    .enum(["ACTIVA", "CANCELADA", "COMPLETADA", "CONTADO", "CESION"])
    .default("ACTIVA"),
  paymentWindow: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  saleDate: z.string().optional().nullable(),
  groupId: z.string().optional().nullable(),
});

// ============================================================================
// PARSERS
// ============================================================================

function parseInputData(
  rawData: string,
  format: "json" | "csv" | "excel"
): { rows: unknown[]; error?: string } {
  if (format === "json") {
    try {
      const parsed = JSON.parse(rawData);
      if (!Array.isArray(parsed)) {
        return { rows: [], error: "El JSON debe ser un array de objetos" };
      }
      return { rows: parsed };
    } catch {
      return { rows: [], error: "JSON invalido. Verifique la sintaxis." };
    }
  }

  if (format === "csv") {
    const result = Papa.parse(rawData, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h: string) => h.trim(),
    });
    if (result.errors.length > 0 && result.data.length === 0) {
      return {
        rows: [],
        error: `CSV invalido: ${result.errors[0].message}`,
      };
    }
    return {
      rows: coerceNumericFields(result.data as Record<string, string>[]),
    };
  }

  // excel — rawData is base64
  try {
    const workbook = XLSX.read(rawData, { type: "base64" });
    const sheetName = workbook.SheetNames[0];
    if (!sheetName) return { rows: [], error: "El archivo Excel esta vacio" };
    const data = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName]);
    return { rows: data };
  } catch {
    return { rows: [], error: "No se pudo leer el archivo Excel" };
  }
}

function coerceNumericFields(rows: Record<string, string>[]): unknown[] {
  const numericKeys = [
    "totalPrice",
    "totalInstallments",
    "regularInstallmentAmount",
    "firstInstallmentAmount",
    "collectionDay",
    "downPayment",
  ];
  return rows.map((row) => {
    const out: Record<string, unknown> = { ...row };
    for (const key of numericKeys) {
      if (key in out && out[key] !== "" && out[key] != null) {
        const n = Number(out[key]);
        if (!isNaN(n)) out[key] = n;
      }
    }
    return out;
  });
}

// ============================================================================
// IMPORT PERSONS
// ============================================================================

export async function importPersons(
  rawData: string,
  format: "json" | "csv" | "excel",
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  const { rows, error } = parseInputData(rawData, format);
  if (error) return { ...result, errors: [error] };

  if (rows.length === 0) {
    return { ...result, errors: ["El array esta vacio"] };
  }

  for (let i = 0; i < rows.length; i++) {
    const rowLabel = `Fila ${i + 1}`;
    try {
      const parsed = personImportSchema.safeParse(rows[i]);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join(", ");
        result.errors.push(`${rowLabel}: ${msg}`);
        continue;
      }

      const data = parsed.data;

      // Check for existing person by DNI
      if (data.dni) {
        const existing = await prisma.person.findUnique({
          where: { dni: data.dni },
          select: { id: true, firstName: true, lastName: true },
        });
        if (existing) {
          result.skipped++;
          result.details.push(
            `${rowLabel}: ${data.firstName} ${data.lastName} (DNI ${data.dni}) ya existe - omitido`
          );
          continue;
        }
      }

      // Check for existing person by CUIT
      if (data.cuit) {
        const existing = await prisma.person.findUnique({
          where: { cuit: data.cuit },
          select: { id: true, firstName: true, lastName: true },
        });
        if (existing) {
          result.skipped++;
          result.details.push(
            `${rowLabel}: ${data.firstName} ${data.lastName} (CUIT ${data.cuit}) ya existe - omitido`
          );
          continue;
        }
      }

      const person = await prisma.person.create({
        data: {
          type: data.type as "CLIENTE" | "PROVEEDOR" | "AMBOS",
          firstName: data.firstName,
          lastName: data.lastName,
          dni: data.dni || null,
          cuit: data.cuit || null,
          email: data.email || null,
          phone: data.phone || null,
          phone2: data.phone2 || null,
          address: data.address || null,
          city: data.city || null,
          province: data.province || null,
          notes: data.notes || null,
          createdById: userId,
        },
      });

      result.created++;
      result.details.push(
        `${rowLabel}: ${data.firstName} ${data.lastName} creado correctamente`
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      result.errors.push(`${rowLabel}: ${msg}`);
    }
  }

  if (result.created > 0) {
    await logAction("Person", "BULK_IMPORT", "IMPORT", {
      newData: { created: result.created, skipped: result.skipped, errors: result.errors.length, format },
    }, userId);
  }

  return result;
}

// ============================================================================
// IMPORT SALES
// ============================================================================

export async function importSales(
  rawData: string,
  format: "json" | "csv" | "excel",
  userId: string
): Promise<ImportResult> {
  const result: ImportResult = {
    created: 0,
    skipped: 0,
    errors: [],
    details: [],
  };

  const { rows, error } = parseInputData(rawData, format);
  if (error) return { ...result, errors: [error] };

  if (rows.length === 0) {
    return { ...result, errors: ["El array esta vacio"] };
  }

  for (let i = 0; i < rows.length; i++) {
    const rowLabel = `Fila ${i + 1}`;
    try {
      const parsed = saleImportSchema.safeParse(rows[i]);
      if (!parsed.success) {
        const msg = parsed.error.errors.map((e) => e.message).join(", ");
        result.errors.push(`${rowLabel}: ${msg}`);
        continue;
      }

      const data = parsed.data;

      // 1. Find the lot by lotNumber + developmentSlug
      const development = await prisma.development.findUnique({
        where: { slug: data.developmentSlug },
        select: { id: true, name: true },
      });
      if (!development) {
        result.errors.push(
          `${rowLabel}: Desarrollo con slug "${data.developmentSlug}" no encontrado`
        );
        continue;
      }

      const lot = await prisma.lot.findUnique({
        where: {
          developmentId_lotNumber: {
            developmentId: development.id,
            lotNumber: data.lotNumber,
          },
        },
        select: { id: true, status: true },
      });
      if (!lot) {
        result.errors.push(
          `${rowLabel}: Lote ${data.lotNumber} no encontrado en ${development.name}`
        );
        continue;
      }

      // Check if lot already has a sale
      const existingSale = await prisma.sale.findUnique({
        where: { lotId: lot.id },
        select: { id: true },
      });
      if (existingSale) {
        result.skipped++;
        result.details.push(
          `${rowLabel}: Lote ${data.lotNumber} ya tiene una venta asignada - omitido`
        );
        continue;
      }

      // 2. Find the person by DNI
      const person = await prisma.person.findUnique({
        where: { dni: data.personDni },
        select: { id: true, firstName: true, lastName: true },
      });
      if (!person) {
        result.errors.push(
          `${rowLabel}: Persona con DNI "${data.personDni}" no encontrada. Importe las personas primero.`
        );
        continue;
      }

      // 3. Calculate installment amounts if not provided
      let regularAmount = data.regularInstallmentAmount;
      if (data.totalInstallments > 0 && !regularAmount) {
        const financedAmount = data.totalPrice - (data.downPayment || 0);
        if (financedAmount <= 0) {
          result.errors.push(
            `${rowLabel}: Monto a financiar debe ser mayor a 0`
          );
          continue;
        }
        if (data.firstInstallmentAmount && data.totalInstallments > 1) {
          const remaining = financedAmount - data.firstInstallmentAmount;
          regularAmount =
            Math.round(
              (remaining / (data.totalInstallments - 1)) * 100
            ) / 100;
        } else {
          regularAmount =
            Math.round(
              (financedAmount / data.totalInstallments) * 100
            ) / 100;
        }
      }

      // 4. Determine lot status
      let lotStatus: "VENDIDO" | "CONTADO" | "PERMUTA" | "CESION";
      switch (data.status) {
        case "CONTADO":
          lotStatus = "CONTADO";
          break;
        case "CESION":
          lotStatus = "PERMUTA";
          break;
        default:
          lotStatus = "VENDIDO";
          break;
      }

      const saleDate = data.saleDate ? new Date(data.saleDate) : new Date();

      // 5. Create Sale + Installments in a transaction
      await prisma.$transaction(async (tx) => {
        const sale = await tx.sale.create({
          data: {
            groupId: data.groupId || null,
            lotId: lot.id,
            personId: person.id,
            saleDate,
            totalPrice: data.totalPrice,
            downPayment: data.downPayment ?? null,
            currency: data.currency as "USD" | "ARS",
            totalInstallments: data.totalInstallments,
            firstInstallmentAmount: data.firstInstallmentAmount ?? null,
            regularInstallmentAmount: regularAmount ?? null,
            firstInstallmentMonth: data.firstInstallmentMonth || null,
            collectionDay: data.collectionDay ?? null,
            status: data.status as
              | "ACTIVA"
              | "CANCELADA"
              | "COMPLETADA"
              | "CONTADO"
              | "CESION",
            notes: data.notes || null,
            paymentWindow: data.paymentWindow || null,
            createdById: userId,
          },
        });

        // Generate installments
        if (
          data.totalInstallments > 0 &&
          regularAmount &&
          data.firstInstallmentMonth &&
          data.collectionDay
        ) {
          const installments = generateInstallments({
            saleId: sale.id,
            totalInstallments: data.totalInstallments,
            regularInstallmentAmount: regularAmount,
            firstInstallmentAmount:
              data.firstInstallmentAmount ?? undefined,
            firstInstallmentMonth: data.firstInstallmentMonth,
            collectionDay: data.collectionDay,
            currency: data.currency as "USD" | "ARS",
          });
          await tx.installment.createMany({ data: installments });
        }

        // Update lot status
        await tx.lot.update({
          where: { id: lot.id },
          data: { status: lotStatus },
        });
      });

      result.created++;
      result.details.push(
        `${rowLabel}: Venta de lote ${data.lotNumber} a ${person.firstName} ${person.lastName} creada`
      );
    } catch (error) {
      const msg =
        error instanceof Error ? error.message : "Error desconocido";
      result.errors.push(`${rowLabel}: ${msg}`);
    }
  }

  if (result.created > 0) {
    await logAction("Sale", "BULK_IMPORT", "IMPORT", {
      newData: { created: result.created, skipped: result.skipped, errors: result.errors.length, format },
    }, userId);
  }

  return result;
}
