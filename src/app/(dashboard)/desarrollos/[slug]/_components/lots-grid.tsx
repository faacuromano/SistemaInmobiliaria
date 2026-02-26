"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import { LOT_STATUS_LABELS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { ChevronDown } from "lucide-react";
import type { LotRow } from "./lots-section";
import type { LotStatus } from "@/types/enums";

const STATUS_BORDER_COLORS: Record<LotStatus, string> = {
  DISPONIBLE: "border-l-emerald-500",
  VENDIDO: "border-l-blue-500",
  CONTADO: "border-l-amber-500",
  PERMUTA: "border-l-violet-500",
  RESERVADO: "border-l-gray-400",
  ESCRITURADO: "border-l-sky-500",
  CESION: "border-l-rose-500",
};

const STATUS_BADGE_BG: Record<LotStatus, string> = {
  DISPONIBLE: "bg-emerald-100 text-emerald-700",
  VENDIDO: "bg-blue-100 text-blue-700",
  CONTADO: "bg-amber-100 text-amber-700",
  PERMUTA: "bg-violet-100 text-violet-700",
  RESERVADO: "bg-gray-100 text-gray-600",
  ESCRITURADO: "bg-sky-100 text-sky-700",
  CESION: "bg-rose-100 text-rose-700",
};

function formatShortPrice(price: number): string {
  if (price >= 1_000_000) return `$${(price / 1_000_000).toFixed(1)}M`;
  if (price >= 1_000) return `$${(price / 1_000).toFixed(0)}K`;
  return formatCurrency(price, "USD");
}

interface Props {
  lots: LotRow[];
  selectedLotId?: string | null;
  onSelectLot?: (lot: LotRow) => void;
}

export function LotsGrid({ lots, selectedLotId, onSelectLot }: Props) {
  const groupedByBlock = useMemo(() => {
    const groups = new Map<string, LotRow[]>();

    for (const lot of lots) {
      const key = lot.block || "__sin_manzana__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(lot);
    }

    // Sort groups: named blocks first (alphabetically), then "Sin Manzana"
    const sorted: { label: string; key: string; lots: LotRow[] }[] = [];
    const keys = [...groups.keys()].sort((a, b) => {
      if (a === "__sin_manzana__") return 1;
      if (b === "__sin_manzana__") return -1;
      return a.localeCompare(b, "es", { numeric: true });
    });

    for (const key of keys) {
      sorted.push({
        key,
        label: key === "__sin_manzana__" ? "Sin Manzana" : `Manzana ${key}`,
        lots: groups.get(key)!,
      });
    }

    return sorted;
  }, [lots]);

  const hasMultipleGroups =
    groupedByBlock.length > 1 ||
    (groupedByBlock.length === 1 && groupedByBlock[0].key !== "__sin_manzana__");

  if (lots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center rounded-sm border border-dashed py-12 text-center">
        <p className="text-sm font-medium text-muted-foreground">Sin lotes</p>
        <p className="text-xs text-muted-foreground">
          Este desarrollo no tiene lotes cargados.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedByBlock.map((group) => {
        const gridContent = (
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {group.lots.map((lot) => {
              const buyerName = lot.sale
                ? `${lot.sale.person.firstName} ${lot.sale.person.lastName}`
                : null;
              const isSelected = selectedLotId === lot.id;

              return (
                <button
                  key={lot.id}
                  type="button"
                  onClick={() => onSelectLot?.(lot)}
                  className={cn(
                    "relative flex min-h-[120px] flex-col rounded-lg border border-l-4 bg-card p-3 text-left",
                    "transition-all duration-150 cursor-pointer hover:shadow-md",
                    STATUS_BORDER_COLORS[lot.status],
                    isSelected && "ring-2 ring-primary ring-offset-1 shadow-md"
                  )}
                >
                  {/* Top row: lot number + status badge */}
                  <div className="flex items-start justify-between gap-1">
                    <span className="text-lg font-bold leading-tight text-foreground">
                      {lot.lotNumber}
                    </span>
                    <span
                      className={cn(
                        "shrink-0 rounded px-1.5 py-0.5 text-[10px] font-semibold leading-none",
                        STATUS_BADGE_BG[lot.status]
                      )}
                    >
                      {LOT_STATUS_LABELS[lot.status]}
                    </span>
                  </div>

                  {/* Middle: area + price */}
                  <div className="mt-auto space-y-0.5 pt-2">
                    {lot.area != null && (
                      <p className="text-xs text-muted-foreground">
                        {lot.area} m²
                      </p>
                    )}
                    {lot.listPrice != null && (
                      <p className="text-xs font-semibold text-foreground">
                        {formatShortPrice(lot.listPrice)}
                      </p>
                    )}
                  </div>

                  {/* Bottom: buyer name */}
                  {buyerName && (
                    <p className="mt-1 max-w-full truncate text-[11px] font-medium text-muted-foreground">
                      {buyerName}
                    </p>
                  )}

                  {/* Tag dots */}
                  {lot.tags.length > 0 && (
                    <div className="mt-1.5 flex gap-1">
                      {lot.tags.slice(0, 4).map((tag) => (
                        <span
                          key={tag.id}
                          className="block h-2 w-2 rounded-full"
                          style={{
                            backgroundColor: tag.color || "currentColor",
                          }}
                        />
                      ))}
                      {lot.tags.length > 4 && (
                        <span className="text-[9px] leading-none text-muted-foreground">
                          +{lot.tags.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        );

        // When there are multiple groups, wrap in Collapsible with header
        if (hasMultipleGroups) {
          return (
            <Collapsible defaultOpen key={group.key}>
              <CollapsibleTrigger className="flex w-full items-center gap-2 py-1 group cursor-pointer">
                <h3 className="text-sm font-semibold text-foreground">
                  {group.label}
                </h3>
                <span className="text-xs text-muted-foreground">
                  ({group.lots.length} lotes)
                </span>
                <div className="h-px flex-1 bg-border" />
                <ChevronDown className="h-4 w-4 text-muted-foreground transition-transform group-data-[state=open]:rotate-180" />
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2">{gridContent}</div>
              </CollapsibleContent>
            </Collapsible>
          );
        }

        // Single group with no block name: render grid flat
        return <div key={group.key}>{gridContent}</div>;
      })}
    </div>
  );
}
