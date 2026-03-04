"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Printer, Loader2 } from "lucide-react";
import { getSaleForPrint } from "@/server/actions/sale.actions";
import { PrintableComprobante, type SalePrintData } from "../../_components/printable-comprobante";

interface Props {
  saleId: string;
}

export function SalePrintButton({ saleId }: Props) {
  const [sale, setSale] = useState<SalePrintData | null>(null);
  const [loading, setLoading] = useState(false);

  function handlePrint() {
    if (sale) {
      window.print();
      return;
    }
    setLoading(true);
    getSaleForPrint(saleId)
      .then((data) => {
        setSale(data);
        // Wait for DOM to render the print view before printing
        setTimeout(() => window.print(), 100);
      })
      .finally(() => setLoading(false));
  }

  // Prefetch on mount so print is instant
  useEffect(() => {
    getSaleForPrint(saleId).then(setSale);
  }, [saleId]);

  return (
    <>
      <Button variant="outline" size="sm" onClick={handlePrint} disabled={loading}>
        {loading ? (
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
        ) : (
          <Printer className="mr-2 h-4 w-4" />
        )}
        Imprimir Venta
      </Button>

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

      {/* Hidden print view */}
      {sale && (
        <div data-sale-print className="hidden print:block">
          <PrintableComprobante sale={sale} />
        </div>
      )}
    </>
  );
}
