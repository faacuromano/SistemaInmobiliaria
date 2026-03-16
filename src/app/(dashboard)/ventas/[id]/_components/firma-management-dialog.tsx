"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import { SigningFormDialog } from "@/app/(dashboard)/firmas/_components/signing-form-dialog";
import { formatDate } from "@/lib/format";
import {
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_COLORS,
} from "@/lib/constants";
import {
  getUnlinkedSignings,
  unlinkSigningFromSale,
  linkSigningToSale,
} from "@/server/actions/signing.actions";
import type { SigningStatus } from "@/types/enums";

interface FirmaManagementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sale: {
    id: string;
    sellerId: string | null;
    person: { firstName: string; lastName: string };
    lot: {
      lotNumber: string;
      block: string | null;
      development: { id: string; name: string };
    };
  };
  signing: {
    id: string;
    date: Date | string;
    time: string;
    status: string;
    notes: string | null;
  } | null;
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
}

export function FirmaManagementDialog({
  open,
  onOpenChange,
  sale,
  signing,
  developments,
  sellers,
}: FirmaManagementDialogProps) {
  const router = useRouter();
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [selectedSigningId, setSelectedSigningId] = useState("");
  const [unlinkedSignings, setUnlinkedSignings] = useState<
    Array<{
      id: string;
      clientName: string | null;
      lotInfo: string;
      date: Date | string;
      time: string;
      status: string;
    }>
  >([]);
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    if (open && !signing) {
      getUnlinkedSignings(sale.lot.development.id).then(setUnlinkedSignings);
    }
  }, [open, signing, sale.lot.development.id]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSelectedSigningId("");
      setLinking(false);
    }
  }, [open]);

  async function handleUnlink() {
    if (!signing) return;
    const result = await unlinkSigningFromSale(signing.id);
    if (result.success) {
      toast.success("Firma desvinculada");
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al desvincular firma");
    }
  }

  async function handleLink() {
    if (!selectedSigningId) return;
    setLinking(true);
    const result = await linkSigningToSale(selectedSigningId, sale.id);
    if (result.success) {
      toast.success("Firma vinculada");
      router.refresh();
      onOpenChange(false);
    } else {
      toast.error(result.error || "Error al vincular firma");
    }
    setLinking(false);
  }

  const createDefaults = {
    id: "",
    date: "",
    time: "",
    endTime: null,
    lotInfo: sale.lot.block
      ? `Lote ${sale.lot.lotNumber} - Mz ${sale.lot.block} - ${sale.lot.development.name}`
      : `Lote ${sale.lot.lotNumber} - ${sale.lot.development.name}`,
    clientName: `${sale.person.firstName} ${sale.person.lastName}`,
    lotNumbers: sale.lot.lotNumber,
    developmentId: sale.lot.development.id,
    sellerId: sale.sellerId,
    status: "PENDIENTE",
    notes: null,
    saleId: sale.id,
    saleLabel: `${sale.person.firstName} ${sale.person.lastName} - Lote ${sale.lot.lotNumber}`,
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-lg p-6">
          <DialogHeader>
            <DialogTitle>Firma de Escritura</DialogTitle>
          </DialogHeader>

          {signing ? (
            <div className="space-y-3">
              <div>
                <p className="text-sm text-muted-foreground">Estado</p>
                <StatusBadge
                  label={SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
                  variant={SIGNING_STATUS_COLORS[signing.status as SigningStatus]}
                />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Fecha</p>
                <p className="font-medium">{formatDate(signing.date)}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Hora</p>
                <p className="font-medium">{signing.time}</p>
              </div>
              {signing.notes && (
                <div>
                  <p className="text-sm text-muted-foreground">Notas</p>
                  <p className="text-sm whitespace-pre-wrap text-muted-foreground">
                    {signing.notes}
                  </p>
                </div>
              )}
              <div className="flex gap-2 justify-end pt-2">
                <Button asChild variant="outline" size="sm">
                  <Link href="/firmas">Ver en Firmas</Link>
                </Button>
                <ConfirmDialog
                  title="Desvincular Firma"
                  description="Se desvinculara la firma de esta venta. La firma no se eliminara, solo se quitara la relacion. Los pagos seguiran habilitados."
                  onConfirm={handleUnlink}
                  variant="destructive"
                  trigger={
                    <Button variant="destructive" size="sm">
                      Desvincular
                    </Button>
                  }
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {unlinkedSignings.length > 0 ? (
                <div className="space-y-3">
                  <Select
                    value={selectedSigningId}
                    onValueChange={setSelectedSigningId}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccionar firma..." />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedSignings.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.clientName || "Sin cliente"} - {s.lotInfo} (
                          {formatDate(s.date)} {s.time})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      Crear Nueva
                    </Button>
                    <Button
                      size="sm"
                      disabled={!selectedSigningId || linking}
                      onClick={handleLink}
                    >
                      {linking ? "Vinculando..." : "Vincular"}
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-sm text-muted-foreground">
                    No hay firmas disponibles para vincular en este desarrollo
                  </p>
                  <div className="flex gap-2 justify-end">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowCreateDialog(true)}
                    >
                      Crear Nueva
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <SigningFormDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        developments={developments}
        sellers={sellers}
        defaultValues={createDefaults}
      />
    </>
  );
}
