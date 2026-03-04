"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Printer, ExternalLink, CheckCircle2, Loader2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { getSaleForPrint } from "@/server/actions/sale.actions";
import { PrintableComprobante, type SalePrintData } from "./printable-comprobante";

interface Props {
  saleId: string | null;
  open: boolean;
  onClose: () => void;
}

export function SaleSuccessDialog({ saleId, open, onClose }: Props) {
  const router = useRouter();
  const [sale, setSale] = useState<SalePrintData | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!saleId) {
      setSale(null);
      return;
    }
    setLoading(true);
    getSaleForPrint(saleId)
      .then(setSale)
      .finally(() => setLoading(false));
  }, [saleId]);

  function handlePrint() {
    window.print();
  }

  function handleViewSale() {
    if (saleId) {
      router.push(`/ventas/${saleId}`);
      router.refresh();
    }
  }

  const personName = sale?.person
    ? `${sale.person.firstName} ${sale.person.lastName}`
    : "";
  const lotLabel = sale?.lot
    ? sale.lot.block
      ? `Lote ${sale.lot.lotNumber} - Mz ${sale.lot.block}`
      : `Lote ${sale.lot.lotNumber}`
    : "";
  const devName = sale?.lot?.development?.name ?? "";
  const currency = (sale?.currency as "USD" | "ARS") ?? "USD";

  return (
    <Dialog open={open} onOpenChange={(isOpen) => { if (!isOpen) onClose(); }}>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader className="print:hidden">
          <DialogTitle className="flex items-center gap-2">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
            Venta Creada Exitosamente
          </DialogTitle>
          <DialogDescription>
            Puede imprimir el comprobante o ir al detalle de la venta.
          </DialogDescription>
        </DialogHeader>

        {/* Print styles */}
        <style>{`
          @media print {
            body * {
              visibility: hidden;
            }
            [data-sale-print],
            [data-sale-print] * {
              visibility: visible;
            }
            [data-sale-print] {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              padding: 32px 40px;
              font-size: 12px;
              color: black;
            }
            [data-sale-print] table {
              width: 100%;
              border-collapse: collapse;
            }
            [data-sale-print] th,
            [data-sale-print] td {
              border: 1px solid #ccc;
              padding: 4px 8px;
              text-align: left;
            }
            [data-sale-print] th {
              background-color: #f3f4f6;
              font-weight: 600;
            }
            .print\\:hidden {
              display: none !important;
            }
          }
        `}</style>

        {loading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        )}

        {!loading && sale && (
          <>
            {/* On-screen summary (hidden when printing) */}
            <div className="print:hidden space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs text-muted-foreground">Comprador</p>
                  <p className="font-medium">{personName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Lote</p>
                  <p className="font-medium">{lotLabel} — {devName}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Precio Total</p>
                  <p className="font-medium">{formatCurrency(sale.totalPrice, currency)}</p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Cuotas</p>
                  <p className="font-medium">
                    {sale.totalInstallments > 0 ? `${sale.totalInstallments} cuotas` : "Contado"}
                  </p>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={handleViewSale}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Ver Venta
                </Button>
                <Button onClick={handlePrint}>
                  <Printer className="mr-2 h-4 w-4" />
                  Imprimir Comprobante
                </Button>
              </div>
            </div>

            {/* Print view (hidden on screen, visible when printing) */}
            <div data-sale-print className="hidden print:block">
              <PrintableComprobante sale={sale} />
            </div>
          </>
        )}

        {!loading && !sale && saleId && (
          <div className="print:hidden text-center py-8">
            <p className="text-muted-foreground">No se pudo cargar la venta.</p>
            <Button variant="outline" className="mt-4" onClick={onClose}>
              Volver a Ventas
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
