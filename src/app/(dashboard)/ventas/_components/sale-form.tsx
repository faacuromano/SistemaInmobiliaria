"use client";

import { useActionState, useEffect, useState, useMemo, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { saleCreateSchema, type SaleCreateInput } from "@/schemas/sale.schema";
import { createSale } from "@/server/actions/sale.actions";
import { SaleStatus, Currency } from "@/types/enums";
import { SALE_STATUS_LABELS, CURRENCY_LABELS } from "@/lib/constants";
import { calculateInstallmentPreview } from "@/lib/sale-helpers";
import { formatCurrency } from "@/lib/format";
import type { ActionResult } from "@/types/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  persons: Array<{ id: string; firstName: string; lastName: string }>;
  sellers: Array<{ id: string; name: string }>;
}

function getTodayString(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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

export function SaleForm({ developments, lots, persons, sellers }: Props) {
  const router = useRouter();

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
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
      saleDate: getTodayString(),
      totalPrice: "",
      downPayment: "",
      currency: Currency.USD,
      totalInstallments: "0",
      firstInstallmentAmount: "",
      firstInstallmentMonth: getCurrentMonthString(),
      collectionDay: "",
      commissionAmount: "",
      status: SaleStatus.ACTIVA,
      notes: "",
      paymentWindow: "",
    },
  });

  // Track if user manually edited the first installment month
  const userEditedMonth = useRef(false);

  // Development selection is local state, not a form field
  const [selectedDevelopmentId, setSelectedDevelopmentId] = useState("");

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

  // Auto-update firstInstallmentMonth when collectionDay changes
  useEffect(() => {
    const day = parseInt(watchedCollectionDay || "0", 10);
    if (day >= 1 && day <= 31 && !userEditedMonth.current) {
      form.setValue("firstInstallmentMonth", getSmartFirstMonth(day));
    }
  }, [watchedCollectionDay, form]);

  const showInstallmentSection =
    watchedStatus === SaleStatus.ACTIVA;

  // Auto-calculated installment amount
  const autoCalculated = useMemo(() => {
    const price = parseFloat(watchedTotalPrice || "0");
    const down = parseFloat(watchedDownPayment || "0");
    const installments = parseInt(watchedTotalInstallments || "0", 10);
    const firstAmount = parseFloat(watchedFirstInstallmentAmount || "0") || 0;

    const toFinance = Math.max(price - down, 0);

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
      toFinance,
      perInstallment,
      firstInstallment,
      hasCustomFirst,
      totalInstallments: installments,
    };
  }, [watchedTotalPrice, watchedDownPayment, watchedTotalInstallments, watchedFirstInstallmentAmount]);

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
    if (state.success) {
      toast.success("Venta creada exitosamente");
      router.push("/ventas");
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  // Reset lotId when development changes
  function handleDevelopmentChange(devId: string) {
    setSelectedDevelopmentId(devId);
    form.setValue("lotId", "");
  }

  const currencyCode = (watchedCurrency as "USD" | "ARS") || "USD";

  return (
    <Form {...form}>
      <form action={formAction} className="space-y-6">
        {/* Section 1: Lote */}
        <Card>
          <CardHeader>
            <CardTitle>Lote</CardTitle>
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
            <CardTitle>Comprador</CardTitle>
          </CardHeader>
          <CardContent>
            <FormField
              control={form.control}
              name="personId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Persona</FormLabel>
                  <Select
                    name="personId"
                    value={field.value}
                    onValueChange={field.onChange}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Seleccionar comprador" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {persons.map((person) => (
                        <SelectItem key={person.id} value={person.id}>
                          {person.firstName} {person.lastName}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="saleDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Fecha de Venta</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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
            </div>

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

        {/* Section 4: Plan (only for ACTIVA) */}
        {showInstallmentSection && (
          <Card>
            <CardHeader>
              <CardTitle>Plan</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
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

              {autoCalculated.totalInstallments > 0 && (
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
                    <div className="rounded-sm border p-4 bg-muted/50">
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
                        <div className="border-t my-1" />
                        <div className={`flex justify-between font-semibold ${
                          autoCalculated.downPayment > autoCalculated.totalPrice
                            ? "text-destructive"
                            : ""
                        }`}>
                          <span>A Financiar:</span>
                          <span>
                            {autoCalculated.downPayment > autoCalculated.totalPrice
                              ? "Entrega excede el precio"
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
                    <div className="rounded-sm border p-4">
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
            </CardContent>
          </Card>
        )}

        {/* Hidden field for totalInstallments when section is hidden (CONTADO/CESION) */}
        {!showInstallmentSection && (
          <input type="hidden" name="totalInstallments" value="0" />
        )}

        {/* Section 5: Vendedor y Comision */}
        <Card>
          <CardHeader>
            <CardTitle>Vendedor y Comision</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
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
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="commissionAmount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Monto Comision (opcional)</FormLabel>
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
            </div>
          </CardContent>
        </Card>

        {/* Section 6: Notas */}
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
  );
}
