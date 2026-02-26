"use client";

import Link from "next/link";
import { X, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LOT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { LotRow } from "./lots-section";
import type { LotStatus } from "@/types/enums";

const STATUS_BADGE_COLORS: Record<LotStatus, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-800 border-emerald-300",
  VENDIDO: "bg-blue-100 text-blue-800 border-blue-300",
  CONTADO: "bg-amber-100 text-amber-800 border-amber-300",
  PERMUTA: "bg-violet-100 text-violet-800 border-violet-300",
  RESERVADO: "bg-orange-100 text-orange-800 border-orange-300",
  ESCRITURADO: "bg-sky-100 text-sky-800 border-sky-300",
  CESION: "bg-rose-100 text-rose-800 border-rose-300",
};

interface Props {
  lot: LotRow;
  onClose: () => void;
}

export function LotDetailPanel({ lot, onClose }: Props) {
  const buyerName = lot.sale
    ? `${lot.sale.person.firstName} ${lot.sale.person.lastName}`
    : null;

  return (
    <div className="flex h-full w-full flex-col border-l bg-card">
      {/* Header */}
      <div className="flex items-center justify-between border-b px-4 py-3">
        <div>
          <h3 className="text-base font-semibold">
            Lote {lot.lotNumber}
          </h3>
          {lot.block && (
            <p className="text-xs text-muted-foreground">Manzana {lot.block}</p>
          )}
        </div>
        <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7">
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-4">
        {/* Status */}
        <div>
          <p className="text-xs text-muted-foreground mb-1">Estado</p>
          <span
            className={cn(
              "inline-flex items-center rounded-md border px-2.5 py-1 text-sm font-semibold",
              STATUS_BADGE_COLORS[lot.status]
            )}
          >
            {LOT_STATUS_LABELS[lot.status]}
          </span>
        </div>

        {/* Details */}
        <div className="grid grid-cols-2 gap-3">
          {lot.area != null && (
            <div>
              <p className="text-xs text-muted-foreground">Superficie</p>
              <p className="text-sm font-medium">{lot.area} m²</p>
            </div>
          )}
          {lot.listPrice != null && (
            <div>
              <p className="text-xs text-muted-foreground">Precio Lista</p>
              <p className="text-sm font-medium">{formatCurrency(lot.listPrice, "USD")}</p>
            </div>
          )}
          {lot.sale && (
            <div>
              <p className="text-xs text-muted-foreground">Precio de Venta</p>
              <p className="text-sm font-medium">
                {formatCurrency(lot.sale.totalPrice, lot.sale.currency)}
              </p>
            </div>
          )}
          {lot.sale && (
            <div>
              <p className="text-xs text-muted-foreground">Fecha de Venta</p>
              <p className="text-sm font-medium">
                {new Date(lot.sale.saleDate).toLocaleDateString("es-AR")}
              </p>
            </div>
          )}
        </div>

        {/* Tags */}
        {lot.tags.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-1.5">Etiquetas</p>
            <div className="flex flex-wrap gap-1">
              {lot.tags.map((tag) => (
                <Badge
                  key={tag.id}
                  variant="outline"
                  className="text-xs"
                  style={
                    tag.color
                      ? { borderColor: tag.color, color: tag.color }
                      : undefined
                  }
                >
                  {tag.label}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Buyer info */}
        {buyerName && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Comprador</p>
            <p className="text-sm font-medium">{buyerName}</p>
          </div>
        )}

        {/* Notes */}
        {lot.notes && (
          <div>
            <p className="text-xs text-muted-foreground mb-1">Notas</p>
            <p className="text-sm whitespace-pre-wrap text-muted-foreground">
              {lot.notes}
            </p>
          </div>
        )}
      </div>

      {/* Footer actions */}
      <div className="border-t p-4">
        {lot.sale ? (
          <Button asChild className="w-full" size="sm">
            <Link href={`/ventas/${lot.sale.id}`}>
              <ExternalLink className="mr-2 h-3.5 w-3.5" />
              Ver Venta
            </Link>
          </Button>
        ) : (
          <p className="text-center text-xs text-muted-foreground">
            Lote sin venta asignada
          </p>
        )}
      </div>
    </div>
  );
}
