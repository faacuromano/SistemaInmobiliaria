"use client";

import { useActionState, useEffect, useState, useMemo, useRef, useCallback } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saleCreateSchema, type SaleCreateInput } from "@/schemas/sale.schema";
import { createSale } from "@/server/actions/sale.actions";
import { SaleStatus, Currency, InstallmentMode, CesionType } from "@/types/enums";
import { SALE_STATUS_LABELS, CURRENCY_LABELS, CESION_TYPE_LABELS } from "@/lib/constants";
import { calculateInstallmentPreview } from "@/lib/sale-helpers";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/types/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, CalendarDays, Search, X, Phone } from "lucide-react";
import { CreatePersonDialog } from "./create-person-dialog";
import { SaleSuccessDialog } from "./sale-success-dialog";

// Only these statuses are valid for creation
const CREATION_STATUSES: Record<string, string> = {
  [SaleStatus.ACTIVA]: SALE_STATUS_LABELS.ACTIVA,
  [SaleStatus.CONTADO]: SALE_STATUS_LABELS.CONTADO,
  [SaleStatus.CESION]: SALE_STATUS_LABELS.CESION,
};

interface Props {
  developments: Array<{ id: string; name: string }>;
  lots: Array<{
    id: string;
    lotNumber: string;
    block: string | null;
    developmentId: string;
    status: string;
  }>;
  persons: Array<{ id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }>;
  sellers: Array<{ id: string; name: string; commissionRate: number | null }>;
  latestExchangeRate: number | null;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDateDisplay(dateStr: string): string {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function getCurrentMonthString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

function getSmartFirstMonth(collectionDay: number): string {
  const d = new Date();
  const today = d.getDate();
  let year = d.getFullYear();
  let month = d.getMonth(); // 0-indexed

  if (today > collectionDay) {
    month += 1;
    if (month > 11) {
      month = 0;
      year += 1;
    }
  }

  return `${year}-${String(month + 1).padStart(2, "0")}`;
}

export function SaleForm({ developments, lots, persons: initialPersons, sellers, latestExchangeRate }: Props) {
  const router = useRouter();
  const todayString = useRef(getTodayString()).current;

  const [state, formAction, isPending] = useActionState<
    ActionResult<{ saleId: string }> | null,
    FormData
  >(
    (_prev, formData) => createSale({ success: false, error: "" }, formData),
    null
  );

  const form = useForm<SaleCreateInput>({
    resolver: zodResolver(saleCreateSchema),
    defaultValues: {
      lotId: "",
      personId: "",
      sellerId: "",
      saleDate: todayString,
      totalPrice: "",
      downPayment: "",
      currency: Currency.USD,
      totalInstallments: "0",
      firstInstallmentAmount: "",
      firstInstallmentMonth: getCurrentMonthString(),
      collectionDay: "",
      commissionAmount: "",
      installmentMode: InstallmentMode.AUTOMATICO,
      status: SaleStatus.ACTIVA,
      cesionType: undefined,
      cesionDetail: "",
      notes: "",
      paymentWindow: "",
    },
  });

  // Track if user manually edited the first installment month
  const userEditedMonth = useRef(false);

  // Development selection is local state, not a form field
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState("");

  // Persons list can grow when creating inline
  const [personsList, setPersonsList] = useState(initialPersons);

  // Commission mode: false = auto from seller rate, true = manual override
  const [customCommission, setCustomCommission] = useState(false);

  // Exchange rate mode: false = auto from latest rate, true = manual override
  const [customExchangeRate, setCustomExchangeRate] = useState(false);
  const [exchangeRateValue, setExchangeRateValue] = useState(
    latestExchangeRate ? String(latestExchangeRate) : ""
  );

  // Person search
  const [personSearch, setPersonSearch] = useState("");

  // Signing date managed as local state (not in react-hook-form since it's a new field)
  const [signingDate, setSigningDate] = useState("");

  // Sale ID after successful creation (shows success dialog)
  const [successSaleId, setSuccessSaleId] = useState<string | null>(null);

  // Manual installments (when mode = MANUAL)
  const [manualInstallments, setManualInstallments] = useState<
    Array<{ amount: string }>
  >([]);

  // Extra charges (refuerzos) managed as local state, serialized to hidden input
  const [extraCharges, setExtraCharges] = useState<
    Array<{ description: string; amount: string; dueDate: string; notes: string }>
  >([]);

  const addExtraCharge = useCallback(() => {
    setExtraCharges((prev) => [
      ...prev,
      { description: "", amount: "", dueDate: "", notes: "" },
    ]);
  }, []);

  const removeExtraCharge = useCallback((index: number) => {
    setExtraCharges((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const updateExtraCharge = useCallback(
    (index: number, field: string, value: string) => {
      setExtraCharges((prev) =>
        prev.map((ec, i) => (i === index ? { ...ec, [field]: value } : ec))
      );
    },
    []
  );

  // Filter lots by selected development
  const filteredLots = useMemo(
    () =>
      selectedDevelopmentId
        ? lots.filter((l) => l.developmentId === selectedDevelopmentId)
        : [],
    [lots, selectedDevelopmentId]
  );

  // Watch fields for conditional rendering
  const watchedStatus = form.watch("status");
  const watchedTotalInstallments = form.watch("totalInstallments");
  const watchedTotalPrice = form.watch("totalPrice");
  const watchedDownPayment = form.watch("downPayment");
  const watchedFirstInstallmentAmount = form.watch("firstInstallmentAmount");
  const watchedFirstMonth = form.watch("firstInstallmentMonth");
  const watchedCollectionDay = form.watch("collectionDay");
  const watchedCurrency = form.watch("currency");
  const watchedSellerId = form.watch("sellerId");
  const watchedPersonId = form.watch("personId");
  const watchedInstallmentMode = form.watch("installmentMode");

  // Sync manual installments array size with totalInstallments
  useEffect(() => {
    if (watchedInstallmentMode !== InstallmentMode.MANUAL) return;
    const count = parseInt(watchedTotalInstallments || "0", 10);
    if (count <= 0) {
      setManualInstallments([]);
      return;
    }
    setManualInstallments((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill({ amount: "" })];
      }
      return prev.slice(0, count);
    });
  }, [watchedTotalInstallments, watchedInstallmentMode]);

  // Auto-update firstInstallmentMonth when collectionDay changes
  useEffect(() => {
    const day = parseInt(watchedCollectionDay || "0", 10);
    if (day >= 1 && day <= 31 && !userEditedMonth.current) {
      form.setValue("firstInstallmentMonth", getSmartFirstMonth(day));
    }
  }, [watchedCollectionDay, form]);

  // Auto-calculate commission from seller rate
  const selectedSeller = useMemo(
    () => sellers.find((s) => s.id === watchedSellerId),
    [sellers, watchedSellerId]
  );

  const autoCommissionAmount = useMemo(() => {
    if (!selectedSeller?.commissionRate) return null;
    const price = parseFloat(watchedTotalPrice || "0");
    if (price <= 0) return null;
    return Math.round((selectedSeller.commissionRate / 100) * price * 100) / 100;
  }, [selectedSeller, watchedTotalPrice]);

  // When seller changes, reset commission mode and update amount
  useEffect(() => {
    if (!watchedSellerId) {
      setCustomCommission(false);
      form.setValue("commissionAmount", "");
      return;
    }
    const seller = sellers.find((s) => s.id === watchedSellerId);
    if (!seller?.commissionRate) {
      // No default rate, enable manual entry
      setCustomCommission(true);
    } else {
      setCustomCommission(false);
    }
  }, [watchedSellerId, sellers, form]);

  // Auto-fill commission amount when not in custom mode
  useEffect(() => {
    if (!customCommission && autoCommissionAmount !== null) {
      form.setValue("commissionAmount", String(autoCommissionAmount));
    }
  }, [customCommission, autoCommissionAmount, form]);

  const showInstallmentSection =
    watchedStatus === SaleStatus.ACTIVA;

  // Total de refuerzos pactados (reduce el monto a financiar en cuotas)
  const totalExtraCharges = useMemo(
    () => extraCharges.reduce((sum, ec) => sum + (parseFloat(ec.amount) || 0), 0),
    [extraCharges]
  );

  // Auto-calculated installment amount
  const autoCalculated = useMemo(() => {
    const price = parseFloat(watchedTotalPrice || "0");
    const down = parseFloat(watchedDownPayment || "0");
    const installments = parseInt(watchedTotalInstallments || "0", 10);
    const firstAmount = parseFloat(watchedFirstInstallmentAmount || "0") || 0;

    const toFinance = Math.max(price - down - totalExtraCharges, 0);

    let perInstallment = 0;
    let firstInstallment = 0;
    const hasCustomFirst = firstAmount > 0 && installments > 1;

    if (installments > 0) {
      if (hasCustomFirst) {
        firstInstallment = firstAmount;
        const remaining = toFinance - firstAmount;
        perInstallment = remaining / (installments - 1);
      } else {
        perInstallment = toFinance / installments;
        firstInstallment = perInstallment;
      }
    }

    return {
      totalPrice: price,
      downPayment: down,
      totalExtraCharges,
      toFinance,
      perInstallment,
      firstInstallment,
      hasCustomFirst,
      totalInstallments: installments,
    };
  }, [watchedTotalPrice, watchedDownPayment, watchedTotalInstallments, watchedFirstInstallmentAmount, totalExtraCharges]);

  // Calculate installment preview
  const installmentPreview = useMemo(() => {
    const total = autoCalculated.totalInstallments;
    const regular = autoCalculated.perInstallment;
    const month = watchedFirstMonth || "";
    const day = parseInt(watchedCollectionDay || "0", 10);

    if (total > 0 && regular > 0 && month && day >= 1 && day <= 31) {
      return calculateInstallmentPreview({
        totalInstallments: total,
        regularInstallmentAmount: regular,
        firstInstallmentAmount: autoCalculated.hasCustomFirst
          ? autoCalculated.firstInstallment
          : undefined,
        firstInstallmentMonth: month,
        collectionDay: day,
      });
    }
    return [];
  }, [
    autoCalculated.totalInstallments,
    autoCalculated.perInstallment,
    autoCalculated.hasCustomFirst,
    autoCalculated.firstInstallment,
    watchedFirstMonth,
    watchedCollectionDay,
  ]);

  // Handle action result
  useEffect(() => {
    if (!state) return;
    if (state.success && state.data?.saleId) {
      toast.success("Venta creada exitosamente");
      setSuccessSaleId(state.data.saleId);
    } else if (!state.success) {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Reset lotId when development changes
  function handleDevelopmentChange(devId: string) {
    setSelectedDevelopmentId(devId);
    form.setValue("lotId", "");
  }

  // Handle inline person creation
  const handlePersonCreated = useCallback(
    (person: { id: string; firstName: string; lastName: string; dni: string | null; phone: string | null }) => {
      setPersonsList((prev) => [...prev, person]);
      setPersonSearch("");
      form.setValue("personId", person.id, { shouldValidate: true });
    },
    [form]
  );

  // Selected person display info
  const selectedPerson = useMemo(
    () => personsList.find((p) => p.id === watchedPersonId),
    [personsList, watchedPersonId]
  );

  // Filtered persons for search
  const filteredPersons = useMemo(() => {
    if (!personSearch.trim()) return [];
    const query = personSearch.toLowerCase();
    return personsList.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        (p.dni && p.dni.includes(query))
    );
  }, [personsList, personSearch]);

  const currencyCode = (watchedCurrency as "USD" | "ARS") || "USD";

  return (
    <>
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        {/* Hidden auto-set fields */}
        <input type="hidden" name="saleDate" value={todayString} />
        <input type="hidden" name="signingDate" value={signingDate} />
        <input type="hidden" name="extraCharges" value={JSON.stringify(extraCharges)} />
        <input type="hidden" name="manualInstallments" value={JSON.stringify(manualInstallments)} />
        <input type="hidden" name="installmentMode" value={watchedInstallmentMode} />
        {watchedCurrency === Currency.USD && exchangeRateValue && (
          <input type="hidden" name="exchangeRateOverride" value={exchangeRateValue} />
        )}

        {/* Section 1: Lote */}
        <Card>
          <CardHeader>
            <CardTitle>Lote</CardTitle>
            <p className="text-sm text-muted-foreground">
              Selecciona el desarrollo y el lote a vender
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              {/* Development select — local state, not submitted */}
              <div className="space-y-2">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Desarrollo
                </label>
                <Select
                  value={selectedDevelopmentId}
                  onValueChange={handleDevelopmentChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccionar desarrollo" />
                  </SelectTrigger>
                  <SelectContent>
                    {developments.map((dev) => (
                      <SelectItem key={dev.id} value={dev.id}>
                        {dev.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Lot select — form field */}
              <FormField
                control={form.control}
                name="lotId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Lote</FormLabel>
                    <Select
                      name="lotId"
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={!selectedDevelopmentId}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccionar lote" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {filteredLots.map((lot) => (
                          <SelectItem key={lot.id} value={lot.id}>
                            Lote {lot.lotNumber}
                            {lot.block ? ` - Mz ${lot.block}` : ""}
                            {" "}({lot.status})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
          </CardContent>
        </Card>

        {/* Section 2: Comprador */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Comprador</CardTitle>
              <CreatePersonDialog onCreated={handlePersonCreated} />
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            {/* Hidden field for form submission */}
            <input type="hidden" name="personId" value={watchedPersonId} />

            {/* Selected person display */}
            {selectedPerson ? (
              <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="font-medium">
                    {selectedPerson.firstName} {selectedPerson.lastName}
                  </span>
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    {selectedPerson.dni && <span>DNI: {selectedPerson.dni}</span>}
                    {selectedPerson.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedPerson.phone}
                      </span>
                    )}
                  </div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 shrink-0"
                  onClick={() => {
                    form.setValue("personId", "");
                    form.clearErrors("personId");
                    setPersonSearch("");
                  }}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <>
                {/* Search input */}
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre, apellido o DNI..."
                    value={personSearch}
                    onChange={(e) => setPersonSearch(e.target.value)}
                    className="pl-9"
                    autoComplete="off"
                  />
                </div>

                {/* Search results */}
                {personSearch.trim() && (
                  <div className="max-h-48 overflow-y-auto rounded-md border">
                    {filteredPersons.length > 0 ? (
                      filteredPersons.slice(0, 8).map((person) => (
                        <button
                          key={person.id}
                          type="button"
                          className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent transition-colors border-b last:border-b-0"
                          onClick={() => {
                            form.setValue("personId", person.id, { shouldValidate: true });
                            setPersonSearch("");
                          }}
                        >
                          <div className="flex flex-col">
                            <span className="font-medium">
                              {person.firstName} {person.lastName}
                            </span>
                            {person.dni && (
                              <span className="text-xs text-muted-foreground">
                                DNI: {person.dni}
                              </span>
                            )}
                          </div>
                          {person.phone && (
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {person.phone}
                            </span>
                          )}
                        </button>
                      ))
                    ) : (
                      <div className="px-3 py-4 text-center text-sm text-muted-foreground">
                        No se encontraron resultados
                      </div>
                    )}
                  </div>
                )}

                {/* No search hint */}
                {!personSearch.trim() && (
                  <p className="text-sm text-muted-foreground">
                    Escribi un nombre, apellido o DNI para buscar un cliente
                  </p>
                )}
              </>
            )}

            {/* Validation error */}
            <FormField
              control={form.control}
              name="personId"
              render={() => (
                <FormItem className="space-y-0">
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 3: Detalles de Venta */}
        <Card>
          <CardHeader>
            <CardTitle>Detalles de Venta</CardTitle>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4" />
              <span>Fecha de venta: {formatDateDisplay(todayString)}</span>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tipo de Operacion</FormLabel>
                    <Select
                      name="status"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CREATION_STATUSES).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-2">
                <Label htmlFor="signingDate">Fecha de Firma (opcional)</Label>
                <Input
                  id="signingDate"
                  type="date"
                  value={signingDate}
                  onChange={(e) => setSigningDate(e.target.value)}
                />
              </div>
            </div>

            {/* Cesion type (only for CESION status) */}
            {watchedStatus === SaleStatus.CESION && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tipo de Cesion</Label>
                  <Select
                    name="cesionType"
                    value={form.watch("cesionType") || ""}
                    onValueChange={(v) => form.setValue("cesionType", v as CesionType)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar tipo" />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(CESION_TYPE_LABELS).map(([key, label]) => (
                        <SelectItem key={key} value={key}>
                          {label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {form.watch("cesionType") === CesionType.CANJE && (
                  <div className="space-y-2">
                    <Label>Detalle del Canje</Label>
                    <Input
                      name="cesionDetail"
                      type="text"
                      placeholder="Ej: Servicios, Publicidad, Construccion..."
                      value={form.watch("cesionDetail") || ""}
                      onChange={(e) => form.setValue("cesionDetail", e.target.value)}
                    />
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-3 gap-4">
              <FormField
                control={form.control}
                name="totalPrice"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Precio Total</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="downPayment"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Entrega (Anticipo)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        {...field}
                      />
                    </FormControl>
                    {autoCalculated.downPayment > 0 &&
                      autoCalculated.totalPrice > 0 &&
                      autoCalculated.downPayment > autoCalculated.totalPrice && (
                        <p className="text-sm font-medium text-destructive">
                          La entrega ({formatCurrency(autoCalculated.downPayment, currencyCode)}) supera el precio total ({formatCurrency(autoCalculated.totalPrice, currencyCode)})
                        </p>
                      )}
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Moneda</FormLabel>
                    <Select
                      name="currency"
                      value={field.value}
                      onValueChange={field.onChange}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {Object.entries(CURRENCY_LABELS).map(
                          ([key, label]) => (
                            <SelectItem key={key} value={key}>
                              {label}
                            </SelectItem>
                          )
                        )}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            {watchedCurrency === Currency.USD && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="customExchangeRate"
                    checked={customExchangeRate}
                    onCheckedChange={(checked) => {
                      setCustomExchangeRate(checked);
                      if (!checked && latestExchangeRate) {
                        setExchangeRateValue(String(latestExchangeRate));
                      }
                    }}
                  />
                  <Label htmlFor="customExchangeRate" className="text-sm">
                    Cotizacion especifica
                  </Label>
                  {!customExchangeRate && latestExchangeRate && (
                    <span className="text-xs text-muted-foreground">
                      (Dolar Blue Venta: ${latestExchangeRate})
                    </span>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Cotizacion USD/ARS</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    value={exchangeRateValue}
                    onChange={(e) => setExchangeRateValue(e.target.value)}
                    disabled={!customExchangeRate && latestExchangeRate !== null}
                    className={
                      !customExchangeRate && latestExchangeRate !== null
                        ? "bg-muted"
                        : ""
                    }
                  />
                </div>
              </div>
            )}

            <FormField
              control={form.control}
              name="paymentWindow"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Ventana de Pago (opcional)</FormLabel>
                  <FormControl>
                    <Input
                      type="text"
                      placeholder="Ej: del 1 al 20, vence el 30"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Section 4: Vendedor y Comision */}
        <Card>
          <CardHeader>
            <CardTitle>Vendedor y Comision</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <FormField
              control={form.control}
              name="sellerId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Vendedor (opcional)</FormLabel>
                  <Select
                    name="sellerId"
                    value={field.value ?? ""}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Sin vendedor" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {sellers.map((seller) => (
                        <SelectItem key={seller.id} value={seller.id}>
                          {seller.name}
                          {seller.commissionRate
                            ? ` (${seller.commissionRate}%)`
                            : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {watchedSellerId && (
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <Switch
                    id="customCommission"
                    checked={customCommission}
                    onCheckedChange={(checked) => {
                      setCustomCommission(checked);
                      if (!checked && autoCommissionAmount !== null) {
                        form.setValue("commissionAmount", String(autoCommissionAmount));
                      }
                    }}
                  />
                  <Label htmlFor="customCommission" className="text-sm">
                    Comision especifica
                  </Label>
                  {!customCommission && selectedSeller?.commissionRate && (
                    <span className="text-xs text-muted-foreground">
                      ({selectedSeller.commissionRate}% del precio total)
                    </span>
                  )}
                </div>

                <FormField
                  control={form.control}
                  name="commissionAmount"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        Monto Comision ({currencyCode})
                      </FormLabel>
                      <FormControl>
                        <Input
                          type="number"
                          step="0.01"
                          min="0"
                          placeholder="0.00"
                          {...field}
                          disabled={!customCommission && autoCommissionAmount !== null}
                          className={
                            !customCommission && autoCommissionAmount !== null
                              ? "bg-muted"
                              : ""
                          }
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
            )}
          </CardContent>
        </Card>

        {/* Section 5: Plan de Cuotas (only for ACTIVA) */}
        {showInstallmentSection && (
          <Card>
            <CardHeader>
              <CardTitle>Plan de Cuotas</CardTitle>
              <p className="text-sm text-muted-foreground">
                Configura el plan de pagos en cuotas
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Installment mode toggle */}
              <div className="flex items-center gap-3">
                <Label>Modo de cuotas:</Label>
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant={watchedInstallmentMode === InstallmentMode.AUTOMATICO ? "default" : "outline"}
                    size="sm"
                    onClick={() => form.setValue("installmentMode", InstallmentMode.AUTOMATICO)}
                  >
                    Automaticas
                  </Button>
                  <Button
                    type="button"
                    variant={watchedInstallmentMode === InstallmentMode.MANUAL ? "default" : "outline"}
                    size="sm"
                    onClick={() => form.setValue("installmentMode", InstallmentMode.MANUAL)}
                  >
                    Manuales
                  </Button>
                </div>
              </div>

              <FormField
                control={form.control}
                name="totalInstallments"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cantidad de Cuotas</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        placeholder="0"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {autoCalculated.totalInstallments > 0 && watchedInstallmentMode === InstallmentMode.AUTOMATICO && (
                <>
                  {/* Optional first installment override */}
                  <FormField
                    control={form.control}
                    name="firstInstallmentAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Monto 1ra Cuota (opcional)</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="Dejar vacio para usar el monto calculado"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Auto-calculated installment amount (read-only) */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      {autoCalculated.hasCustomFirst
                        ? "Monto Cuotas 2 en adelante (auto-calculado)"
                        : "Monto por Cuota (auto-calculado)"}
                    </label>
                    <p className="text-lg font-semibold text-primary">
                      {autoCalculated.perInstallment > 0
                        ? formatCurrency(autoCalculated.perInstallment, currencyCode)
                        : "Ingrese precio total y cantidad de cuotas"}
                    </p>
                  </div>

                  {/* Financing breakdown */}
                  {autoCalculated.totalPrice > 0 && (
                    <div className="rounded-md border p-4 bg-muted/50">
                      <div className="space-y-1 font-mono text-sm">
                        <div className="flex justify-between">
                          <span>Precio Total:</span>
                          <span>{formatCurrency(autoCalculated.totalPrice, currencyCode)}</span>
                        </div>
                        {autoCalculated.downPayment > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Entrega:</span>
                            <span>-{formatCurrency(autoCalculated.downPayment, currencyCode)}</span>
                          </div>
                        )}
                        {autoCalculated.totalExtraCharges > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Refuerzos pactados:</span>
                            <span>-{formatCurrency(autoCalculated.totalExtraCharges, currencyCode)}</span>
                          </div>
                        )}
                        <div className="border-t my-1" />
                        <div className={`flex justify-between font-semibold ${
                          autoCalculated.toFinance <= 0 && autoCalculated.totalPrice > 0
                            ? "text-destructive"
                            : ""
                        }`}>
                          <span>A Financiar en cuotas:</span>
                          <span>
                            {autoCalculated.toFinance <= 0 && autoCalculated.totalPrice > 0
                              ? "Entrega + refuerzos cubren el total"
                              : formatCurrency(autoCalculated.toFinance, currencyCode)}
                          </span>
                        </div>
                        {autoCalculated.perInstallment > 0 && autoCalculated.hasCustomFirst ? (
                          <>
                            <div className="flex justify-between font-semibold text-primary">
                              <span>1ra cuota:</span>
                              <span>{formatCurrency(autoCalculated.firstInstallment, currencyCode)}</span>
                            </div>
                            <div className="flex justify-between font-semibold text-primary">
                              <span>Cuotas 2-{autoCalculated.totalInstallments}:{" "}
                                {autoCalculated.totalInstallments - 1} x</span>
                              <span>{formatCurrency(autoCalculated.perInstallment, currencyCode)}</span>
                            </div>
                          </>
                        ) : autoCalculated.perInstallment > 0 ? (
                          <div className="flex justify-between font-semibold text-primary">
                            <span>Cuotas: {autoCalculated.totalInstallments} x</span>
                            <span>{formatCurrency(autoCalculated.perInstallment, currencyCode)}</span>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstInstallmentMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mes Primera Cuota</FormLabel>
                          <FormControl>
                            <Input
                              type="month"
                              {...field}
                              onChange={(e) => {
                                userEditedMonth.current = true;
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collectionDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Cobro</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {/* Installment Preview */}
                  {installmentPreview.length > 0 && (
                    <div className="rounded-md border p-4">
                      <h4 className="mb-3 text-sm font-medium">
                        Vista previa de cuotas
                      </h4>
                      <div className="max-h-60 overflow-y-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b text-left text-muted-foreground">
                              <th className="pb-2 pr-4">#</th>
                              <th className="pb-2 pr-4">Mes</th>
                              <th className="pb-2 pr-4">Vencimiento</th>
                              <th className="pb-2 text-right">Monto</th>
                            </tr>
                          </thead>
                          <tbody>
                            {installmentPreview.map((inst) => (
                              <tr key={inst.number} className="border-b last:border-0">
                                <td className="py-1.5 pr-4">{inst.number}</td>
                                <td className="py-1.5 pr-4">{inst.monthLabel}</td>
                                <td className="py-1.5 pr-4">
                                  {inst.dueDate.toLocaleDateString("es-AR")}
                                </td>
                                <td className="py-1.5 text-right">
                                  {formatCurrency(
                                    inst.amount,
                                    currencyCode
                                  )}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                          <tfoot>
                            <tr className="font-medium">
                              <td colSpan={3} className="pt-2 pr-4">
                                Total cuotas
                              </td>
                              <td className="pt-2 text-right">
                                {formatCurrency(
                                  installmentPreview.reduce(
                                    (sum, i) => sum + i.amount,
                                    0
                                  ),
                                  currencyCode
                                )}
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* Manual installments mode */}
              {autoCalculated.totalInstallments > 0 && watchedInstallmentMode === InstallmentMode.MANUAL && (
                <>
                  {/* Financing breakdown for manual mode */}
                  {autoCalculated.totalPrice > 0 && (
                    <div className="rounded-md border p-4 bg-muted/50">
                      <div className="space-y-1 font-mono text-sm">
                        <div className="flex justify-between">
                          <span>Precio Total:</span>
                          <span>{formatCurrency(autoCalculated.totalPrice, currencyCode)}</span>
                        </div>
                        {autoCalculated.downPayment > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Entrega:</span>
                            <span>-{formatCurrency(autoCalculated.downPayment, currencyCode)}</span>
                          </div>
                        )}
                        {autoCalculated.totalExtraCharges > 0 && (
                          <div className="flex justify-between text-muted-foreground">
                            <span>Refuerzos pactados:</span>
                            <span>-{formatCurrency(autoCalculated.totalExtraCharges, currencyCode)}</span>
                          </div>
                        )}
                        <div className="border-t my-1" />
                        <div className="flex justify-between font-semibold">
                          <span>A Financiar en cuotas:</span>
                          <span>{formatCurrency(autoCalculated.toFinance, currencyCode)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Manual installment inputs */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium leading-none">
                      Montos de cada cuota ({currencyCode})
                    </label>
                    <div className="max-h-72 overflow-y-auto space-y-2">
                      {manualInstallments.map((inst, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <span className="text-sm text-muted-foreground w-16 shrink-0">
                            Cuota {index + 1}
                          </span>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            placeholder="0.00"
                            value={inst.amount}
                            onChange={(e) => {
                              setManualInstallments((prev) =>
                                prev.map((item, i) =>
                                  i === index ? { amount: e.target.value } : item
                                )
                              );
                            }}
                            className="flex-1"
                          />
                        </div>
                      ))}
                    </div>

                    {/* Manual total validation */}
                    {(() => {
                      const manualTotal = manualInstallments.reduce(
                        (sum, i) => sum + (parseFloat(i.amount) || 0),
                        0
                      );
                      const diff = Math.abs(manualTotal - autoCalculated.toFinance);
                      return (
                        <div className={`text-sm font-medium ${diff > 0.02 ? "text-destructive" : "text-green-600"}`}>
                          Total ingresado: {formatCurrency(manualTotal, currencyCode)}
                          {diff > 0.02 && (
                            <span className="ml-2">
                              (Diferencia: {formatCurrency(diff, currencyCode)})
                            </span>
                          )}
                          {diff <= 0.02 && manualTotal > 0 && <span className="ml-2">OK</span>}
                        </div>
                      );
                    })()}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="firstInstallmentMonth"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Mes Primera Cuota</FormLabel>
                          <FormControl>
                            <Input
                              type="month"
                              {...field}
                              onChange={(e) => {
                                userEditedMonth.current = true;
                                field.onChange(e);
                              }}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="collectionDay"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Dia de Cobro</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              min="1"
                              max="31"
                              placeholder="10"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Section 6: Refuerzos (optional, only for ACTIVA sales) */}
        {showInstallmentSection && (
          <Card>
            <CardHeader>
              <CardTitle>Refuerzos (opcional)</CardTitle>
              <p className="text-sm text-muted-foreground">
                Cuotas de refuerzo pactadas al momento de la firma
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              {extraCharges.map((ec, index) => (
                <div
                  key={index}
                  className="space-y-3 rounded-md border p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">
                      Refuerzo {index + 1}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => removeExtraCharge(index)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="text-sm font-medium">Descripcion</label>
                      <Input
                        placeholder="Ej: Refuerzo escrituracion"
                        value={ec.description}
                        onChange={(e) =>
                          updateExtraCharge(index, "description", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Monto ({currencyCode})
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0.00"
                        value={ec.amount}
                        onChange={(e) =>
                          updateExtraCharge(index, "amount", e.target.value)
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-sm font-medium">
                        Fecha de vencimiento
                      </label>
                      <Input
                        type="date"
                        value={ec.dueDate}
                        onChange={(e) =>
                          updateExtraCharge(index, "dueDate", e.target.value)
                        }
                      />
                    </div>
                  </div>
                </div>
              ))}

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExtraCharge}
              >
                <Plus className="mr-1 h-4 w-4" />
                Agregar Refuerzo
              </Button>

              {extraCharges.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  Total refuerzos:{" "}
                  {formatCurrency(
                    extraCharges.reduce(
                      (sum, ec) => sum + (parseFloat(ec.amount) || 0),
                      0
                    ),
                    currencyCode
                  )}{" "}
                  ({extraCharges.length} programado
                  {extraCharges.length !== 1 ? "s" : ""})
                </p>
              )}
            </CardContent>
          </Card>
        )}

        {/* Hidden field for totalInstallments when section is hidden (CONTADO/CESION) */}
        {!showInstallmentSection && (
          <input type="hidden" name="totalInstallments" value="0" />
        )}

        {/* Section 7: Notas */}
        <Card>
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormControl>
                    <Textarea
                      placeholder="Observaciones o notas sobre la venta..."
                      rows={3}
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </CardContent>
        </Card>

        {/* Submit buttons */}
        <div className="flex gap-2">
          <Button type="submit" disabled={isPending}>
            {isPending ? "Creando..." : "Crear Venta"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => router.back()}
          >
            Cancelar
          </Button>
        </div>
      </form>
    </Form>

    <SaleSuccessDialog
      saleId={successSaleId}
      open={!!successSaleId}
      onClose={() => {
        setSuccessSaleId(null);
        router.push("/ventas");
        router.refresh();
      }}
    />
    </>
  );
}
