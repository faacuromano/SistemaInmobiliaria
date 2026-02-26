"use client";

import { useCallback, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { importPersons, importSales, type ImportResult } from "@/server/actions/import.actions";
import {
  Upload,
  FileJson,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Info,
  ChevronDown,
  ChevronUp,
  FileUp,
  Loader2,
  ClipboardPaste,
  Trash2,
} from "lucide-react";

type EntityType = "persons" | "sales";
type ImportFormat = "json" | "csv" | "excel";

const PERSON_EXAMPLE = `[
  {
    "firstName": "JUAN",
    "lastName": "PEREZ",
    "dni": "12345678",
    "phone": "3462-123456",
    "type": "CLIENTE"
  }
]`;

const SALE_EXAMPLE = `[
  {
    "lotNumber": "212",
    "developmentSlug": "raices-de-alvear",
    "personDni": "12345678",
    "totalPrice": 38380,
    "currency": "USD",
    "totalInstallments": 19,
    "regularInstallmentAmount": 2020,
    "firstInstallmentMonth": "2025-04",
    "collectionDay": 20,
    "status": "ACTIVA",
    "paymentWindow": "del 1 al 20"
  }
]`;

interface FieldDoc {
  name: string;
  required?: boolean;
  desc: string;
}

const PERSON_FIELDS: FieldDoc[] = [
  { name: "firstName", required: true, desc: "Nombre" },
  { name: "lastName", required: true, desc: "Apellido" },
  { name: "dni", desc: "Documento (7-8 digitos). Evita duplicados" },
  { name: "cuit", desc: "CUIT (XX-XXXXXXXX-X)" },
  { name: "email", desc: "Correo electronico" },
  { name: "phone", desc: "Telefono" },
  { name: "phone2", desc: "Telefono alternativo" },
  { name: "address", desc: "Direccion" },
  { name: "city", desc: "Ciudad" },
  { name: "province", desc: "Provincia" },
  { name: "type", desc: "CLIENTE | PROVEEDOR | AMBOS (default: CLIENTE)" },
  { name: "notes", desc: "Notas" },
];

const SALE_FIELDS: FieldDoc[] = [
  { name: "lotNumber", required: true, desc: "Numero de lote" },
  { name: "developmentSlug", required: true, desc: 'Slug del desarrollo (ej: "raices-de-alvear")' },
  { name: "personDni", required: true, desc: "DNI del comprador (debe existir)" },
  { name: "totalPrice", required: true, desc: "Precio total" },
  { name: "currency", desc: "USD | ARS (default: USD)" },
  { name: "totalInstallments", required: true, desc: "Cantidad de cuotas (0 = contado)" },
  { name: "regularInstallmentAmount", desc: "Monto cuota regular (se calcula si no se provee)" },
  { name: "firstInstallmentAmount", desc: "Monto primera cuota (si es diferente)" },
  { name: "firstInstallmentMonth", desc: 'Mes primera cuota "YYYY-MM"' },
  { name: "collectionDay", desc: "Dia de cobro (1-31)" },
  { name: "downPayment", desc: "Entrega / anticipo" },
  { name: "status", desc: "ACTIVA | CONTADO | CESION | COMPLETADA | CANCELADA" },
  { name: "paymentWindow", desc: 'Ventana de pago (ej: "del 1 al 20")' },
  { name: "saleDate", desc: 'Fecha de venta "YYYY-MM-DD" (default: hoy)' },
  { name: "groupId", desc: "ID de grupo para multi-lote" },
  { name: "notes", desc: "Notas" },
];

function parseJsonPreview(input: string): { count: number; valid: boolean; error?: string } {
  if (!input.trim()) return { count: 0, valid: false };
  try {
    const parsed = JSON.parse(input);
    if (!Array.isArray(parsed)) return { count: 0, valid: false, error: "Debe ser un array JSON" };
    return { count: parsed.length, valid: true };
  } catch {
    return { count: 0, valid: false, error: "JSON invalido" };
  }
}

function parseCsvPreview(input: string): { count: number; valid: boolean; error?: string } {
  if (!input.trim()) return { count: 0, valid: false };
  const lines = input.trim().split("\n").filter((l) => l.trim());
  if (lines.length < 2) return { count: 0, valid: false, error: "CSV necesita encabezado + datos" };
  return { count: lines.length - 1, valid: true };
}

const FILE_ACCEPT: Record<ImportFormat, string> = {
  json: ".json",
  csv: ".csv",
  excel: ".xlsx,.xls",
};

function FieldDocTable({ fields }: { fields: FieldDoc[] }) {
  return (
    <div className="grid gap-0.5">
      {fields.map((f) => (
        <div key={f.name} className="flex items-baseline gap-2 text-xs font-mono px-1 py-0.5 rounded hover:bg-muted/50">
          <span className="text-blue-600 dark:text-blue-400 shrink-0">{f.name}</span>
          {f.required && <span className="text-red-500 text-[10px]">*</span>}
          <span className="text-muted-foreground">— {f.desc}</span>
        </div>
      ))}
    </div>
  );
}

export function ImportSection() {
  const [entityType, setEntityType] = useState<EntityType>("persons");
  const [importFormat, setImportFormat] = useState<ImportFormat>("json");
  const [jsonInput, setJsonInput] = useState("");
  const [excelBase64, setExcelBase64] = useState<string | null>(null);
  const [excelFileName, setExcelFileName] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [isPending, startTransition] = useTransition();
  const [docsOpen, setDocsOpen] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const preview = importFormat === "excel"
    ? { count: excelBase64 ? 1 : 0, valid: !!excelBase64, error: undefined }
    : importFormat === "csv"
      ? parseCsvPreview(jsonInput)
      : parseJsonPreview(jsonInput);

  const handleFileRead = useCallback((file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase();
    const validExts = FILE_ACCEPT[importFormat].replace(/\./g, "").split(",");
    if (!ext || !validExts.includes(ext)) {
      toast.error(`Solo se aceptan archivos ${FILE_ACCEPT[importFormat]}`);
      return;
    }
    const reader = new FileReader();
    if (importFormat === "excel") {
      reader.onload = (e) => {
        const data = e.target?.result;
        if (data instanceof ArrayBuffer) {
          const base64 = btoa(
            new Uint8Array(data).reduce((s, b) => s + String.fromCharCode(b), "")
          );
          setExcelBase64(base64);
          setExcelFileName(file.name);
          setResult(null);
          toast.success(`Archivo "${file.name}" cargado`);
        }
      };
      reader.onerror = () => toast.error("Error al leer el archivo");
      reader.readAsArrayBuffer(file);
    } else {
      reader.onload = (e) => {
        const text = e.target?.result;
        if (typeof text === "string") {
          setJsonInput(text);
          setResult(null);
          toast.success(`Archivo "${file.name}" cargado`);
        }
      };
      reader.onerror = () => toast.error("Error al leer el archivo");
      reader.readAsText(file);
    }
  }, [importFormat]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileRead(file);
  }, [handleFileRead]);

  const handleFileInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) handleFileRead(file);
    e.target.value = "";
  }, [handleFileRead]);

  function handleImport() {
    const dataToSend = importFormat === "excel" ? excelBase64 : jsonInput;
    if (!dataToSend?.trim()) {
      toast.error("Ingrese o cargue datos para importar");
      return;
    }

    setResult(null);

    startTransition(async () => {
      try {
        let importResult: ImportResult;

        if (entityType === "persons") {
          importResult = await importPersons(dataToSend, importFormat);
        } else {
          importResult = await importSales(dataToSend, importFormat);
        }

        setResult(importResult);

        if (importResult.errors.length === 0 && importResult.created > 0) {
          toast.success(
            `Importacion completada: ${importResult.created} registros creados`
          );
        } else if (importResult.errors.length > 0) {
          toast.error(
            `Importacion con errores: ${importResult.errors.length} errores`
          );
        } else if (importResult.created === 0 && importResult.skipped > 0) {
          toast.info("Todos los registros ya existian - nada que importar");
        }
      } catch {
        toast.error("Error inesperado durante la importacion");
      }
    });
  }

  function handleLoadExample() {
    setJsonInput(entityType === "persons" ? PERSON_EXAMPLE : SALE_EXAMPLE);
    setResult(null);
  }

  return (
    <div className="space-y-4">
      {/* Collapsible documentation */}
      <Card>
        <CardHeader
          className="cursor-pointer select-none"
          onClick={() => setDocsOpen(!docsOpen)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileJson className="h-5 w-5 text-muted-foreground" />
              <div>
                <CardTitle className="text-base">Formato de Importacion</CardTitle>
                <CardDescription>
                  Referencia de campos JSON para personas y ventas
                </CardDescription>
              </div>
            </div>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              {docsOpen ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </Button>
          </div>
        </CardHeader>
        {docsOpen && (
          <CardContent className="pt-0 space-y-4">
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="outline">Personas</Badge>
              </h4>
              <FieldDocTable fields={PERSON_FIELDS} />
            </div>

            <Separator />

            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Badge variant="outline">Ventas</Badge>
              </h4>
              <FieldDocTable fields={SALE_FIELDS} />
            </div>

            <div className="flex items-start gap-2 text-sm text-muted-foreground bg-blue-50 dark:bg-blue-950/20 p-3 rounded-md">
              <Info className="h-4 w-4 mt-0.5 flex-shrink-0 text-blue-600" />
              <div className="text-xs space-y-1">
                <p>Importe <strong>personas primero</strong>, luego ventas (busca comprador por DNI).</p>
                <p>La importacion es <strong>idempotente</strong>: ejecutar dos veces no crea duplicados.</p>
                <p>Errores en un registro <strong>no detienen</strong> el resto.</p>
                <p><span className="text-red-500">*</span> = campo requerido.</p>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Import form */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-muted-foreground" />
            <CardTitle className="text-base">Importar Datos</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Entity type + format + actions row */}
          <div className="flex items-end gap-3 flex-wrap">
            <div className="space-y-2 w-40">
              <Label>Entidad</Label>
              <Select
                value={entityType}
                onValueChange={(v) => {
                  setEntityType(v as EntityType);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="persons">Personas</SelectItem>
                  <SelectItem value="sales">Ventas</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2 w-32">
              <Label>Formato</Label>
              <Select
                value={importFormat}
                onValueChange={(v) => {
                  setImportFormat(v as ImportFormat);
                  setJsonInput("");
                  setExcelBase64(null);
                  setExcelFileName(null);
                  setResult(null);
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="json">JSON</SelectItem>
                  <SelectItem value="csv">CSV</SelectItem>
                  <SelectItem value="excel">Excel</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {importFormat !== "excel" && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleLoadExample}
                type="button"
              >
                <ClipboardPaste className="h-3.5 w-3.5 mr-1.5" />
                Cargar ejemplo
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              type="button"
            >
              <FileUp className="h-3.5 w-3.5 mr-1.5" />
              Subir {importFormat === "excel" ? ".xlsx" : importFormat === "csv" ? ".csv" : ".json"}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept={FILE_ACCEPT[importFormat]}
              className="hidden"
              onChange={handleFileInputChange}
            />
          </div>

          {/* Drop zone + textarea */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>{importFormat === "excel" ? "Archivo Excel" : importFormat === "csv" ? "Datos CSV" : "Datos JSON"}</Label>
              {jsonInput.trim() && (
                <div className="flex items-center gap-2">
                  {preview.valid ? (
                    <Badge variant="secondary" className="text-xs gap-1">
                      <CheckCircle2 className="h-3 w-3 text-green-600" />
                      {preview.count} {preview.count === 1 ? "registro" : "registros"}
                    </Badge>
                  ) : (
                    <Badge variant="destructive" className="text-xs gap-1">
                      <XCircle className="h-3 w-3" />
                      {preview.error}
                    </Badge>
                  )}
                </div>
              )}
            </div>
            <div
              className={`relative rounded-md transition-colors ${
                isDragOver
                  ? "ring-2 ring-primary ring-offset-2"
                  : ""
              }`}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
            >
              {isDragOver && (
                <div className="absolute inset-0 z-10 flex items-center justify-center bg-primary/5 rounded-md border-2 border-dashed border-primary">
                  <div className="flex flex-col items-center gap-2 text-primary">
                    <FileUp className="h-8 w-8" />
                    <span className="text-sm font-medium">Soltar archivo aqui</span>
                  </div>
                </div>
              )}
              {importFormat === "excel" ? (
                <div className="flex items-center justify-center rounded-md border border-dashed p-12 text-center">
                  {excelFileName ? (
                    <div className="space-y-1">
                      <CheckCircle2 className="mx-auto h-8 w-8 text-green-600" />
                      <p className="text-sm font-medium">{excelFileName}</p>
                      <p className="text-xs text-muted-foreground">Archivo cargado. Presione Importar para procesar.</p>
                    </div>
                  ) : (
                    <div className="space-y-1">
                      <FileUp className="mx-auto h-8 w-8 text-muted-foreground" />
                      <p className="text-sm text-muted-foreground">
                        Arrastre un archivo .xlsx aqui o use el boton &quot;Subir .xlsx&quot;
                      </p>
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  value={jsonInput}
                  onChange={(e) => {
                    setJsonInput(e.target.value);
                    setResult(null);
                  }}
                  placeholder={
                    importFormat === "csv"
                      ? `Pegue los datos CSV con encabezados, o arrastre un archivo .csv aqui...\n\nEjemplo:\nfirstName,lastName,dni,type\nJUAN,PEREZ,12345678,CLIENTE`
                      : `Pegue el array JSON de ${entityType === "persons" ? "personas" : "ventas"}, o arrastre un archivo .json aqui...`
                  }
                  rows={14}
                  className="font-mono text-sm resize-none"
                />
              )}
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            <Button
              onClick={handleImport}
              disabled={isPending || !preview.valid}
              type="button"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Importando...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4 mr-2" />
                  Importar {preview.valid ? `${preview.count} ` : ""}{entityType === "persons" ? "Personas" : "Ventas"}
                </>
              )}
            </Button>
            {(jsonInput.trim() || excelBase64) && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setJsonInput("");
                  setExcelBase64(null);
                  setExcelFileName(null);
                  setResult(null);
                }}
                type="button"
              >
                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                Limpiar
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Results */}
      {result && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado de Importacion</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Summary */}
            <div className="grid grid-cols-3 gap-3">
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
                  <CheckCircle2 className="h-4 w-4 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.created}</p>
                  <p className="text-xs text-muted-foreground">Creados</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-yellow-100 dark:bg-yellow-900/30">
                  <AlertTriangle className="h-4 w-4 text-yellow-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.skipped}</p>
                  <p className="text-xs text-muted-foreground">Omitidos</p>
                </div>
              </div>
              <div className="flex items-center gap-3 rounded-lg border p-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 dark:bg-red-900/30">
                  <XCircle className="h-4 w-4 text-red-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{result.errors.length}</p>
                  <p className="text-xs text-muted-foreground">Errores</p>
                </div>
              </div>
            </div>

            {/* Errors */}
            {result.errors.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-red-700 dark:text-red-400 mb-2">
                  Errores
                </h4>
                <div className="bg-red-50 dark:bg-red-950/20 rounded-md p-3 space-y-1 max-h-60 overflow-y-auto">
                  {result.errors.map((err, i) => (
                    <p key={i} className="text-xs text-red-700 dark:text-red-400 font-mono">
                      {err}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* Details */}
            {result.details.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-muted-foreground mb-2">
                  Detalle
                </h4>
                <div className="bg-muted rounded-md p-3 space-y-1 max-h-60 overflow-y-auto">
                  {result.details.map((detail, i) => (
                    <p key={i} className="text-xs font-mono">
                      {detail}
                    </p>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
