"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Plus, Tags, LayoutGrid, List } from "lucide-react";
import { LotsTable } from "./lots-table";
import { LotsGrid } from "./lots-grid";
import { LotDetailPanel } from "./lot-detail-panel";
import { LotFormDialog } from "./lot-form-dialog";
import { LotFilters } from "./lot-filters";
import { ManageTagsDialog } from "./manage-tags-dialog";
import { LOT_STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { LotStatus } from "@/types/enums";

export type TagInfo = {
  id: string;
  name: string;
  label: string;
  color: string | null;
};

export type TagWithCount = TagInfo & {
  _count: { lots: number };
};

export type LotRow = {
  id: string;
  lotNumber: string;
  block: string | null;
  area: number | null;
  listPrice: number | null;
  status: LotStatus;
  notes: string | null;
  sale: { id: string; person: { firstName: string; lastName: string } } | null;
  tags: TagInfo[];
};

type ViewMode = "grid" | "table";

const STORAGE_KEY = "lots-view-mode";

const STATUS_DOT_COLORS: Record<LotStatus, string> = {
  DISPONIBLE: "bg-emerald-500",
  VENDIDO: "bg-blue-500",
  CONTADO: "bg-amber-500",
  PERMUTA: "bg-violet-500",
  RESERVADO: "bg-gray-400",
  ESCRITURADO: "bg-sky-500",
  CESION: "bg-rose-500",
};

// Ordered list for consistent display
const STATUS_ORDER: LotStatus[] = [
  "DISPONIBLE",
  "RESERVADO",
  "VENDIDO",
  "CONTADO",
  "ESCRITURADO",
  "CESION",
  "PERMUTA",
];

interface Props {
  lots: LotRow[];
  developmentId: string;
  canManage: boolean;
  canManageLots: boolean;
  allTags: TagWithCount[];
}

export function LotsSection({ lots, developmentId, canManage, canManageLots, allTags }: Props) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingLot, setEditingLot] = useState<LotRow | null>(null);
  const [tagsDialogOpen, setTagsDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [selectedLot, setSelectedLot] = useState<LotRow | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  // Read persisted view mode from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as ViewMode | null;
    if (stored === "grid" || stored === "table") {
      setViewMode(stored);
    }
  }, []);

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    setIsMobile(mq.matches);
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  function handleViewChange(mode: ViewMode) {
    setViewMode(mode);
    localStorage.setItem(STORAGE_KEY, mode);
    if (mode === "table") setSelectedLot(null);
  }

  const statusCounts = useMemo(() => {
    const counts: Partial<Record<LotStatus, number>> = {};
    for (const lot of lots) {
      counts[lot.status] = (counts[lot.status] || 0) + 1;
    }
    return counts;
  }, [lots]);

  function handleEdit(lot: LotRow) {
    setEditingLot(lot);
    setDialogOpen(true);
  }

  function handleNew() {
    setEditingLot(null);
    setDialogOpen(true);
  }

  function handleDialogChange(open: boolean) {
    setDialogOpen(open);
    if (!open) setEditingLot(null);
  }

  const viewButtons: { mode: ViewMode; icon: typeof LayoutGrid; label: string }[] = [
    { mode: "grid", icon: LayoutGrid, label: "Grilla" },
    { mode: "table", icon: List, label: "Tabla" },
  ];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold">Lotes</h2>
        <div className="flex items-center gap-2">
          {/* View toggle */}
          <div className="flex rounded-sm border">
            {viewButtons.map((vb, i) => (
              <Button
                key={vb.mode}
                variant="ghost"
                size="sm"
                onClick={() => handleViewChange(vb.mode)}
                className={cn(
                  "rounded-none px-2.5",
                  i === 0 && "rounded-l-sm",
                  i === viewButtons.length - 1 && "rounded-r-sm",
                  viewMode === vb.mode && "bg-muted"
                )}
                title={vb.label}
              >
                <vb.icon className="h-4 w-4" />
                <span className="ml-1.5 hidden sm:inline">{vb.label}</span>
              </Button>
            ))}
          </div>

          {canManageLots && (
            <Button onClick={() => setTagsDialogOpen(true)} size="sm" variant="outline">
              <Tags className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Gestionar Etiquetas</span>
              <span className="sm:hidden">Etiquetas</span>
            </Button>
          )}
          {canManage && (
            <Button onClick={handleNew} size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Nuevo Lote
            </Button>
          )}
        </div>
      </div>

      {/* Status summary bar */}
      {lots.length > 0 && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-muted-foreground">
          {STATUS_ORDER.filter((s) => statusCounts[s]).map((status) => (
            <div key={status} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "inline-block h-2.5 w-2.5 rounded-full",
                  STATUS_DOT_COLORS[status]
                )}
              />
              <span>
                {LOT_STATUS_LABELS[status]}:{" "}
                <span className="font-medium text-foreground">
                  {statusCounts[status]}
                </span>
              </span>
            </div>
          ))}
        </div>
      )}

      <LotFilters />

      {viewMode === "table" ? (
        <LotsTable
          lots={lots}
          canManage={canManage}
          canManageLots={canManageLots}
          allTags={allTags}
          onEdit={handleEdit}
        />
      ) : (
        /* Grid mode — manzana grouping, white cards, desktop side panel */
        <div className="flex gap-4">
          <div className={cn("min-w-0", selectedLot ? "flex-1" : "w-full")}>
            <LotsGrid
              lots={lots}
              selectedLotId={selectedLot?.id}
              onSelectLot={(lot) =>
                setSelectedLot(selectedLot?.id === lot.id ? null : lot)
              }
            />
          </div>

          {/* Desktop detail panel */}
          {selectedLot && (
            <div className="hidden w-72 shrink-0 md:block lg:w-80">
              <div className="sticky top-0 h-[calc(100vh-12rem)] overflow-hidden rounded-lg border">
                <LotDetailPanel
                  lot={selectedLot}
                  onClose={() => setSelectedLot(null)}
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile detail sheet — only opens on screens below md breakpoint */}
      <Sheet
        open={isMobile && !!selectedLot}
        onOpenChange={(open) => { if (!open) setSelectedLot(null); }}
      >
        <SheetContent side="right" showCloseButton={false} aria-describedby={undefined} className="w-80 p-0">
          <SheetTitle className="sr-only">Detalle del lote</SheetTitle>
          {selectedLot && (
            <LotDetailPanel
              lot={selectedLot}
              onClose={() => setSelectedLot(null)}
            />
          )}
        </SheetContent>
      </Sheet>

      {canManage && (
        <LotFormDialog
          open={dialogOpen}
          onOpenChange={handleDialogChange}
          developmentId={developmentId}
          defaultValues={editingLot ?? undefined}
        />
      )}
      {canManageLots && (
        <ManageTagsDialog
          open={tagsDialogOpen}
          onOpenChange={setTagsDialogOpen}
          tags={allTags}
        />
      )}
    </div>
  );
}
