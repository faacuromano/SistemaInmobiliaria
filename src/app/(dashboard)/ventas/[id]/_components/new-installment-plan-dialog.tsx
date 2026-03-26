"use client";

import { useActionState, useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createNewInstallmentPlan } from "@/server/actions/sale.actions";
import { formatCurrency } from "@/lib/format";
import { InstallmentMode } from "@/types/enums";
import type { ActionResult } from "@/types/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  remainingBalance: number;
  currency: "USD" | "ARS";
}

function getCurrentMonthString(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function NewInstallmentPlanDialog({
  open,
  onOpenChange,
  saleId,
  remainingBalance,
  currency,
}: Props) {
  const router = useRouter();

  const [totalInstallments, setTotalInstallments] = useState("12");
  const [installmentMode, setInstallmentMode] = useState<string>(
    InstallmentMode.AUTOMATICO
  );
  const [firstMonth, setFirstMonth] = useState(getCurrentMonthString());
  const [collectionDay, setCollectionDay] = useState("10");
  const [manualInstallments, setManualInstallments] = useState<
    Array<{ amount: string }>
  >([]);

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      createNewInstallmentPlan({ success: false, error: "" }, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Plan de cuotas creado correctamente");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (open) {
      setTotalInstallments("12");
      setInstallmentMode(InstallmentMode.AUTOMATICO);
      setFirstMonth(getCurrentMonthString());
      setCollectionDay("10");
      setManualInstallments([]);
    }
  }, [open]);

  const count = parseInt(totalInstallments || "0", 10);

  // Sync manual installments array with count
  useEffect(() => {
    if (installmentMode !== InstallmentMode.MANUAL || count <= 0) return;
    setManualInstallments((prev) => {
      if (prev.length === count) return prev;
      if (prev.length < count) {
        return [...prev, ...Array(count - prev.length).fill({ amount: "" })];
      }
      return prev.slice(0, count);
    });
  }, [count, installmentMode]);

  const autoAmount = useMemo(() => {
    if (count <= 0 || remainingBalance <= 0) return 0;
    return Math.round((remainingBalance / count) * 100) / 100;
  }, [count, remainingBalance]);

  const manualTotal = useMemo(
    () =>
      manualInstallments.reduce(
        (sum, i) => sum + (parseFloat(i.amount) || 0),
        0
      ),
    [manualInstallments]
  );

  const manualDiff = Math.abs(manualTotal - remainingBalance);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nuevo Plan de Cuotas</DialogTitle>
        </DialogHeader>

        <div className="px-2 pb-4">
          <div className="mb-4 rounded-md bg-muted p-3 text-sm">
            <p>
              Saldo pendiente a financiar:{" "}
              <span className="font-semibold">
                {formatCurrency(remainingBalance, currency)}
              </span>
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="saleId" value={saleId} />
            <input type="hidden" name="installmentMode" value={installmentMode} />
            <input
              type="hidden"
              name="manualInstallments"
              value={JSON.stringify(manualInstallments)}
            />

            {/* Mode toggle */}
            <div className="flex items-center gap-3">
              <Label>Modo:</Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant={
                    installmentMode === InstallmentMode.AUTOMATICO
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setInstallmentMode(InstallmentMode.AUTOMATICO)}
                >
                  Automaticas
                </Button>
                <Button
                  type="button"
                  variant={
                    installmentMode === InstallmentMode.MANUAL
                      ? "default"
                      : "outline"
                  }
                  size="sm"
                  onClick={() => setInstallmentMode(InstallmentMode.MANUAL)}
                >
                  Manuales
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cantidad de Cuotas</Label>
              <Input
                name="totalInstallments"
                type="number"
                min="1"
                step="1"
                value={totalInstallments}
                onChange={(e) => setTotalInstallments(e.target.value)}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Mes Primera Cuota</Label>
                <Input
                  name="firstInstallmentMonth"
                  type="month"
                  value={firstMonth}
                  onChange={(e) => setFirstMonth(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label>Dia de Cobro</Label>
                <Input
                  name="collectionDay"
                  type="number"
                  min="1"
                  max="31"
                  value={collectionDay}
                  onChange={(e) => setCollectionDay(e.target.value)}
                />
              </div>
            </div>

            {/* Auto mode preview */}
            {installmentMode === InstallmentMode.AUTOMATICO && count > 0 && (
              <div className="rounded-md border p-3 bg-muted/50 text-sm font-mono">
                <div className="flex justify-between font-semibold">
                  <span>
                    {count} cuotas de:
                  </span>
                  <span>{formatCurrency(autoAmount, currency)}</span>
                </div>
              </div>
            )}

            {/* Manual mode inputs */}
            {installmentMode === InstallmentMode.MANUAL && count > 0 && (
              <div className="space-y-2">
                <Label>Monto de cada cuota ({currency})</Label>
                <div className="max-h-52 overflow-y-auto space-y-2">
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
                              i === index
                                ? { amount: e.target.value }
                                : item
                            )
                          );
                        }}
                        className="flex-1"
                      />
                    </div>
                  ))}
                </div>
                <div
                  className={`text-sm font-medium ${
                    manualDiff > 0.02
                      ? "text-destructive"
                      : "text-green-600"
                  }`}
                >
                  Total: {formatCurrency(manualTotal, currency)}
                  {manualDiff > 0.02 && (
                    <span className="ml-2">
                      (Diferencia: {formatCurrency(manualDiff, currency)})
                    </span>
                  )}
                  {manualDiff <= 0.02 && manualTotal > 0 && (
                    <span className="ml-2">OK</span>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || count <= 0}>
                {isPending ? "Creando..." : "Crear Plan de Cuotas"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
