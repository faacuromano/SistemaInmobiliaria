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
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Search } from "lucide-react";
import { transferSale } from "@/server/actions/sale-transfer.actions";
import type { ActionResult } from "@/types/actions";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saleId: string;
  currentPersonName: string;
  persons: Array<{
    id: string;
    firstName: string;
    lastName: string;
    dni: string | null;
  }>;
}

export function TransferSaleDialog({
  open,
  onOpenChange,
  saleId,
  currentPersonName,
  persons,
}: Props) {
  const router = useRouter();
  const [toPersonId, setToPersonId] = useState("");
  const [transferDate, setTransferDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [renegotiate, setRenegotiate] = useState(false);
  const [notes, setNotes] = useState("");
  const [personSearch, setPersonSearch] = useState("");

  const [state, formAction, isPending] = useActionState<
    ActionResult | null,
    FormData
  >(
    (_prev, formData) =>
      transferSale({ success: false, error: "" }, formData),
    null
  );

  useEffect(() => {
    if (!state) return;
    if (state.success) {
      toast.success("Venta transferida correctamente");
      onOpenChange(false);
      router.refresh();
    } else {
      toast.error(state.error);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  useEffect(() => {
    if (open) {
      setToPersonId("");
      setTransferDate(new Date().toISOString().split("T")[0]);
      setRenegotiate(false);
      setNotes("");
      setPersonSearch("");
    }
  }, [open]);

  const selectedPerson = useMemo(
    () => persons.find((p) => p.id === toPersonId),
    [persons, toPersonId]
  );

  const filteredPersons = useMemo(() => {
    if (!personSearch.trim()) return [];
    const query = personSearch.toLowerCase();
    return persons.filter(
      (p) =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(query) ||
        (p.dni && p.dni.includes(query))
    );
  }, [persons, personSearch]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Transferir Venta</DialogTitle>
        </DialogHeader>

        <div className="px-2 pb-4">
          <div className="mb-4 rounded-md bg-muted p-3 text-sm">
            <p>
              Cliente actual:{" "}
              <span className="font-semibold">{currentPersonName}</span>
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Se cambiara el titular de la venta. Quedara registro del historial
              de transferencia.
            </p>
          </div>

          <form action={formAction} className="space-y-4">
            <input type="hidden" name="saleId" value={saleId} />
            <input type="hidden" name="toPersonId" value={toPersonId} />
            <input type="hidden" name="renegotiate" value={String(renegotiate)} />
            <input type="hidden" name="newInstallments" value="[]" />

            <div className="space-y-2">
              <Label>Fecha de Transferencia</Label>
              <Input
                name="transferDate"
                type="date"
                value={transferDate}
                onChange={(e) => setTransferDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Nuevo Cliente</Label>
              {selectedPerson ? (
                <div className="flex items-center justify-between rounded-md border bg-muted/50 px-3 py-2">
                  <span className="font-medium">
                    {selectedPerson.firstName} {selectedPerson.lastName}
                    {selectedPerson.dni && (
                      <span className="text-xs text-muted-foreground ml-2">
                        DNI: {selectedPerson.dni}
                      </span>
                    )}
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setToPersonId("");
                      setPersonSearch("");
                    }}
                  >
                    Cambiar
                  </Button>
                </div>
              ) : (
                <>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      placeholder="Buscar por nombre o DNI..."
                      value={personSearch}
                      onChange={(e) => setPersonSearch(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                  {personSearch.trim() && (
                    <div className="max-h-40 overflow-y-auto rounded-md border">
                      {filteredPersons.length > 0 ? (
                        filteredPersons.slice(0, 6).map((person) => (
                          <button
                            key={person.id}
                            type="button"
                            className="flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-accent border-b last:border-0"
                            onClick={() => {
                              setToPersonId(person.id);
                              setPersonSearch("");
                            }}
                          >
                            <span>
                              {person.firstName} {person.lastName}
                            </span>
                            {person.dni && (
                              <span className="text-xs text-muted-foreground">
                                DNI: {person.dni}
                              </span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-3 py-3 text-center text-sm text-muted-foreground">
                          No se encontraron resultados
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="flex items-center gap-3">
              <Switch
                id="renegotiate"
                checked={renegotiate}
                onCheckedChange={setRenegotiate}
              />
              <Label htmlFor="renegotiate" className="text-sm">
                Renegociar cuotas pendientes
              </Label>
            </div>

            {renegotiate && (
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-900 dark:bg-amber-950 dark:text-amber-200">
                <p>
                  Las cuotas pendientes seran eliminadas. Despues de la
                  transferencia, podra crear un nuevo plan de cuotas desde la
                  pagina de la venta.
                </p>
              </div>
            )}

            <div className="space-y-2">
              <Label>Notas (opcional)</Label>
              <Textarea
                name="notes"
                rows={2}
                placeholder="Motivo de la transferencia..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isPending || !toPersonId}>
                {isPending ? "Transfiriendo..." : "Transferir Venta"}
              </Button>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
