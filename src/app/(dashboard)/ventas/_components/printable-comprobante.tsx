import { Separator } from "@/components/ui/separator";
import { formatCurrency, formatDate } from "@/lib/format";
import { SALE_STATUS_LABELS } from "@/lib/constants";
import type { SaleStatus } from "@/types/enums";
import type { getSaleForPrint } from "@/server/actions/sale.actions";

export type SalePrintData = NonNullable<Awaited<ReturnType<typeof getSaleForPrint>>>;

export function PrintableComprobante({ sale }: { sale: SalePrintData }) {
  const personName = `${sale.person.firstName} ${sale.person.lastName}`;
  const currency = sale.currency as "USD" | "ARS";
  const lotLabel = sale.lot.block
    ? `Lote ${sale.lot.lotNumber} - Mz ${sale.lot.block}`
    : `Lote ${sale.lot.lotNumber}`;
  const devName = sale.lot.development?.name ?? "";
  const sellerName = sale.seller
    ? `${sale.seller.name} ${sale.seller.lastName}`
    : null;

  return (
    <div className="space-y-5 text-sm">
      {/* Header / Membrete */}
      <div className="text-center space-y-1">
        <h1 className="text-xl font-bold tracking-tight">{sale.companyName}</h1>
        <h2 className="text-base font-semibold uppercase tracking-wide">
          Comprobante de Venta
        </h2>
        <p className="text-xs text-gray-500">
          Fecha de emision: {formatDate(new Date())}
        </p>
      </div>

      <Separator className="print:border-gray-300" />

      {/* Datos del Comprador */}
      <div>
        <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
          Comprador
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <span className="text-xs text-gray-500">Nombre: </span>
            <span className="font-medium">{personName}</span>
          </div>
          {sale.person.dni && (
            <div>
              <span className="text-xs text-gray-500">DNI: </span>
              <span className="font-medium">{sale.person.dni}</span>
            </div>
          )}
          {sale.person.phone && (
            <div>
              <span className="text-xs text-gray-500">Telefono: </span>
              <span className="font-medium">{sale.person.phone}</span>
            </div>
          )}
          {sale.person.email && (
            <div>
              <span className="text-xs text-gray-500">Email: </span>
              <span className="font-medium">{sale.person.email}</span>
            </div>
          )}
        </div>
      </div>

      <Separator className="print:border-gray-300" />

      {/* Datos del Lote */}
      <div>
        <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
          Lote
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <span className="text-xs text-gray-500">Lote: </span>
            <span className="font-medium">{lotLabel}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500">Desarrollo: </span>
            <span className="font-medium">{devName}</span>
          </div>
        </div>
      </div>

      <Separator className="print:border-gray-300" />

      {/* Detalles de Venta */}
      <div>
        <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
          Detalles de Venta
        </h3>
        <div className="grid grid-cols-2 gap-x-6 gap-y-1">
          <div>
            <span className="text-xs text-gray-500">Fecha de venta: </span>
            <span className="font-medium">{formatDate(sale.saleDate)}</span>
          </div>
          {sale.signingDate && (
            <div>
              <span className="text-xs text-gray-500">Fecha de firma: </span>
              <span className="font-medium">{formatDate(sale.signingDate)}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-500">Precio total: </span>
            <span className="font-medium">{formatCurrency(sale.totalPrice, currency)}</span>
          </div>
          {sale.downPayment != null && sale.downPayment > 0 && (
            <div>
              <span className="text-xs text-gray-500">Anticipo: </span>
              <span className="font-medium">{formatCurrency(sale.downPayment, currency)}</span>
            </div>
          )}
          <div>
            <span className="text-xs text-gray-500">Moneda: </span>
            <span className="font-medium">{currency}</span>
          </div>
          <div>
            <span className="text-xs text-gray-500">Estado: </span>
            <span className="font-medium">
              {SALE_STATUS_LABELS[sale.status as SaleStatus] ?? sale.status}
            </span>
          </div>
          {sale.paymentWindow && (
            <div>
              <span className="text-xs text-gray-500">Ventana de pago: </span>
              <span className="font-medium">{sale.paymentWindow}</span>
            </div>
          )}
        </div>
      </div>

      {/* Plan de Cuotas */}
      {sale.installments.length > 0 && (
        <>
          <Separator className="print:border-gray-300" />
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
              Plan de Cuotas ({sale.totalInstallments} cuotas)
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 px-2 border-b font-semibold">#</th>
                  <th className="text-left py-1 px-2 border-b font-semibold">Vencimiento</th>
                  <th className="text-right py-1 px-2 border-b font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {sale.installments.map((inst) => (
                  <tr key={inst.id}>
                    <td className="py-1 px-2 border-b">{inst.installmentNumber}</td>
                    <td className="py-1 px-2 border-b">{formatDate(inst.dueDate)}</td>
                    <td className="py-1 px-2 border-b text-right">
                      {formatCurrency(inst.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="font-semibold">
                  <td colSpan={2} className="py-1 px-2 text-right">Total cuotas:</td>
                  <td className="py-1 px-2 text-right">
                    {formatCurrency(
                      sale.installments.reduce((sum, i) => sum + i.amount, 0),
                      currency
                    )}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </>
      )}

      {/* Refuerzos */}
      {sale.extraCharges.length > 0 && (
        <>
          <Separator className="print:border-gray-300" />
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
              Refuerzos
            </h3>
            <table className="w-full text-xs">
              <thead>
                <tr>
                  <th className="text-left py-1 px-2 border-b font-semibold">Descripcion</th>
                  <th className="text-left py-1 px-2 border-b font-semibold">Vencimiento</th>
                  <th className="text-right py-1 px-2 border-b font-semibold">Monto</th>
                </tr>
              </thead>
              <tbody>
                {sale.extraCharges.map((ec) => (
                  <tr key={ec.id}>
                    <td className="py-1 px-2 border-b">{ec.description}</td>
                    <td className="py-1 px-2 border-b">{formatDate(ec.dueDate)}</td>
                    <td className="py-1 px-2 border-b text-right">
                      {formatCurrency(ec.amount, currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Vendedor y Comision */}
      {sellerName && (
        <>
          <Separator className="print:border-gray-300" />
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
              Vendedor
            </h3>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1">
              <div>
                <span className="text-xs text-gray-500">Nombre: </span>
                <span className="font-medium">{sellerName}</span>
              </div>
              {sale.commissionAmount != null && sale.commissionAmount > 0 && (
                <div>
                  <span className="text-xs text-gray-500">Comision: </span>
                  <span className="font-medium">
                    {formatCurrency(sale.commissionAmount, currency)}
                  </span>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Notas */}
      {sale.notes && (
        <>
          <Separator className="print:border-gray-300" />
          <div>
            <h3 className="font-semibold text-xs uppercase tracking-wide text-gray-500 mb-2">
              Notas
            </h3>
            <p className="text-xs whitespace-pre-wrap">{sale.notes}</p>
          </div>
        </>
      )}

      <Separator className="print:border-gray-300" />

      {/* Firmas */}
      <div className="grid grid-cols-2 gap-16 pt-8">
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs font-medium">Comprador</p>
            <p className="text-xs text-gray-500">{personName}</p>
          </div>
        </div>
        <div className="text-center">
          <div className="border-t border-gray-400 pt-2">
            <p className="text-xs font-medium">Empresa</p>
            <p className="text-xs text-gray-500">{sale.companyName}</p>
          </div>
        </div>
      </div>

      {/* Pie */}
      <div className="text-center text-xs text-gray-400 pt-4">
        <p>Este documento es un comprobante interno de venta.</p>
      </div>
    </div>
  );
}
