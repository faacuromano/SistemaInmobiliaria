"use client";

import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatDate } from "@/lib/format";
import { Price } from "@/components/shared/price";
import {
  SALE_STATUS_LABELS,
  SALE_STATUS_COLORS,
  LOT_STATUS_LABELS,
  LOT_STATUS_COLORS,
  CURRENCY_LABELS,
  SIGNING_STATUS_LABELS,
  SIGNING_STATUS_COLORS,
} from "@/lib/constants";
import type { SaleStatus, LotStatus, Currency, SigningStatus } from "@/types/enums";
import { Button } from "@/components/ui/button";
import { User, MapPin, FileText, Users, PenTool, Plus, Link2 } from "lucide-react";
import { FirmaManagementDialog } from "./firma-management-dialog";

interface SaleDetail {
  id: string;
  lotId: string;
  personId: string;
  sellerId: string | null;
  saleDate: Date;
  signingDate: Date | null;
  totalPrice: number;
  downPayment: number | null;
  currency: string;
  totalInstallments: number;
  firstInstallmentAmount: number | null;
  regularInstallmentAmount: number | null;
  firstInstallmentMonth: string | null;
  collectionDay: number | null;
  commissionAmount: number | null;
  status: string;
  notes: string | null;
  paymentWindow: string | null;
  lot: {
    id: string;
    lotNumber: string;
    block: string | null;
    status: string;
    development: { id: string; name: string; slug: string };
  };
  person: {
    id: string;
    firstName: string;
    lastName: string;
    dni: string | null;
    phone: string | null;
    email: string | null;
  };
  seller: { id: string; name: string; lastName: string } | null;
  signingSlots?: {
    id: string;
    date: Date | string;
    time: string;
    status: string;
    notes: string | null;
  }[];
}

interface SaleInfoCardsProps {
  sale: SaleDetail;
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
}

export function SaleInfoCards({ sale, developments, sellers }: SaleInfoCardsProps) {
  const [firmaDialogOpen, setFirmaDialogOpen] = useState(false);
  const showSellerCard = sale.seller || sale.commissionAmount;
  const isExempt = sale.status === "CONTADO" || sale.status === "CESION";
  const signing = sale.signingSlots?.[0] ?? null;

  return (
    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
      {/* Card 1: Comprador */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Comprador
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Nombre</p>
            <p className="font-medium">
              {sale.person.firstName} {sale.person.lastName}
            </p>
          </div>
          {sale.person.dni && (
            <div>
              <p className="text-sm text-muted-foreground">DNI</p>
              <p className="font-medium">{sale.person.dni}</p>
            </div>
          )}
          {sale.person.phone && (
            <div>
              <p className="text-sm text-muted-foreground">Telefono</p>
              <p className="font-medium">{sale.person.phone}</p>
            </div>
          )}
          {sale.person.email && (
            <div>
              <p className="text-sm text-muted-foreground">Email</p>
              <p className="font-medium">{sale.person.email}</p>
            </div>
          )}
          <div className="pt-1">
            <Link
              href={`/personas/${sale.personId}`}
              className="text-sm text-primary hover:underline"
            >
              Ver ficha completa
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Card 2: Lote */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Lote
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Numero de Lote</p>
            <p className="font-medium">{sale.lot.lotNumber}</p>
          </div>
          {sale.lot.block && (
            <div>
              <p className="text-sm text-muted-foreground">Manzana</p>
              <p className="font-medium">{sale.lot.block}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Desarrollo</p>
            <Link
              href={`/desarrollos/${sale.lot.development.slug}`}
              className="font-medium text-primary hover:underline"
            >
              {sale.lot.development.name}
            </Link>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Estado del Lote</p>
            <StatusBadge
              label={LOT_STATUS_LABELS[sale.lot.status as LotStatus]}
              variant={LOT_STATUS_COLORS[sale.lot.status as LotStatus]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 3: Detalles de Venta */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Detalles de Venta
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <p className="text-sm text-muted-foreground">Precio Total</p>
            <p className="text-lg font-bold">
              <Price amount={sale.totalPrice} currency={sale.currency as "USD" | "ARS"} />
            </p>
          </div>
          {sale.downPayment !== null && sale.downPayment > 0 && (
            <div>
              <p className="text-sm text-muted-foreground">Entrega (Anticipo)</p>
              <p className="font-medium">
                <Price amount={sale.downPayment} currency={sale.currency as "USD" | "ARS"} />
              </p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Moneda</p>
            <p className="font-medium">
              {CURRENCY_LABELS[sale.currency as Currency]}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Fecha de Venta</p>
            <p className="font-medium">{formatDate(sale.saleDate)}</p>
          </div>
          {sale.signingDate && (
            <div>
              <p className="text-sm text-muted-foreground">Fecha de Firma</p>
              <p className="font-medium">{formatDate(sale.signingDate)}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Cuotas</p>
            <p className="font-medium">
              {sale.totalInstallments === 0
                ? "Contado"
                : `${sale.totalInstallments} cuotas`}
            </p>
          </div>
          {sale.regularInstallmentAmount !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Monto Cuota Regular</p>
              <p className="font-medium">
                <Price amount={sale.regularInstallmentAmount} currency={sale.currency as "USD" | "ARS"} />
              </p>
            </div>
          )}
          {sale.firstInstallmentAmount !== null &&
            sale.firstInstallmentAmount !== sale.regularInstallmentAmount && (
              <div>
                <p className="text-sm text-muted-foreground">
                  Monto Primera Cuota
                </p>
                <p className="font-medium">
                  <Price amount={sale.firstInstallmentAmount} currency={sale.currency as "USD" | "ARS"} />
                </p>
              </div>
            )}
          {sale.collectionDay !== null && (
            <div>
              <p className="text-sm text-muted-foreground">Dia de Cobro</p>
              <p className="font-medium">Dia {sale.collectionDay}</p>
            </div>
          )}
          {sale.paymentWindow && (
            <div>
              <p className="text-sm text-muted-foreground">Ventana de Pago</p>
              <p className="font-medium">{sale.paymentWindow}</p>
            </div>
          )}
          <div>
            <p className="text-sm text-muted-foreground">Estado</p>
            <StatusBadge
              label={SALE_STATUS_LABELS[sale.status as SaleStatus]}
              variant={SALE_STATUS_COLORS[sale.status as SaleStatus]}
            />
          </div>
        </CardContent>
      </Card>

      {/* Card 4: Vendedor y Comision (conditional) */}
      {showSellerCard && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Vendedor y Comision
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {sale.seller && (
              <div>
                <p className="text-sm text-muted-foreground">Vendedor</p>
                <p className="font-medium">{sale.seller.name} {sale.seller.lastName}</p>
              </div>
            )}
            {sale.commissionAmount !== null && (
              <div>
                <p className="text-sm text-muted-foreground">Comision</p>
                <p className="font-medium">
                  <Price amount={sale.commissionAmount} currency={sale.currency as "USD" | "ARS"} />
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Card 5: Firma de Escritura (hidden for exempt sales) */}
      {!isExempt && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PenTool className="h-4 w-4" />
              Firma de Escritura
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {signing ? (
              <div
                className="cursor-pointer space-y-3"
                onClick={() => setFirmaDialogOpen(true)}
              >
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
              </div>
            ) : (
              <>
                <div>
                  <p className="text-sm text-muted-foreground">Estado</p>
                  <StatusBadge label="Sin firma asignada" variant="default" />
                </div>
                <p className="text-sm text-muted-foreground">
                  Esta venta aun no tiene una firma de escritura vinculada.
                </p>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFirmaDialogOpen(true)}
                  >
                    <Plus className="mr-2 h-3.5 w-3.5" />
                    Crear Nueva
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setFirmaDialogOpen(true)}
                  >
                    <Link2 className="mr-2 h-3.5 w-3.5" />
                    Vincular Existente
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Notes card (conditional) */}
      {sale.notes && (
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Notas</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="whitespace-pre-wrap text-sm">{sale.notes}</p>
          </CardContent>
        </Card>
      )}

      {!isExempt && (
        <FirmaManagementDialog
          open={firmaDialogOpen}
          onOpenChange={setFirmaDialogOpen}
          sale={{
            id: sale.id,
            sellerId: sale.sellerId,
            person: sale.person,
            lot: sale.lot,
          }}
          signing={signing}
          developments={developments}
          sellers={sellers}
        />
      )}
    </div>
  );
}
