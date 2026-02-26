"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Check, Tags, RefreshCw, X } from "lucide-react";
import { bulkUpdateLotStatus } from "@/server/actions/lot.actions";
import { bulkSetLotTags } from "@/server/actions/tag.actions";
import { LOT_STATUS_LABELS } from "@/lib/constants";
import type { TagWithCount } from "./lots-section";
import type { LotStatus } from "@/types/enums";

const BULK_STATUS_OPTIONS: LotStatus[] = ["DISPONIBLE", "RESERVADO"];

interface Props {
  selectedCount: number;
  selectedIds: string[];
  allTags: TagWithCount[];
  onClearSelection: () => void;
}

export function BulkActionsBar({
  selectedCount,
  selectedIds,
  allTags,
  onClearSelection,
}: Props) {
  const router = useRouter();
  const [isPendingStatus, startStatusTransition] = useTransition();
  const [isPendingTags, startTagsTransition] = useTransition();
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [selectedTagIds, setSelectedTagIds] = useState<Set<string>>(new Set());

  function handleStatusChange(status: LotStatus) {
    startStatusTransition(async () => {
      const result = await bulkUpdateLotStatus(selectedIds, status);
      if (result.success) {
        toast.success(
          `Estado actualizado a "${LOT_STATUS_LABELS[status]}" en ${selectedCount} lote(s)`
        );
        router.refresh();
        onClearSelection();
      } else {
        toast.error(result.error);
      }
    });
  }

  function handleOpenTagDialog() {
    setSelectedTagIds(new Set());
    setTagDialogOpen(true);
  }

  function toggleTag(tagId: string) {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  }

  function handleApplyTags() {
    startTagsTransition(async () => {
      const result = await bulkSetLotTags(
        selectedIds,
        Array.from(selectedTagIds)
      );
      if (result.success) {
        toast.success(
          `Etiquetas actualizadas en ${selectedCount} lote(s)`
        );
        router.refresh();
        onClearSelection();
        setTagDialogOpen(false);
      } else {
        toast.error(result.error);
      }
    });
  }

  const isPending = isPendingStatus || isPendingTags;

  return (
    <>
      <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2">
        <div className="flex items-center gap-3 rounded-lg border bg-card px-4 py-3 shadow-lg">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCount} lote(s) seleccionados
          </span>

          <div className="h-5 w-px bg-border" />

          {/* Tag assignment */}
          <Button
            size="sm"
            variant="outline"
            onClick={handleOpenTagDialog}
            disabled={isPending}
          >
            <Tags className="mr-2 h-4 w-4" />
            Asignar Etiquetas
          </Button>

          {/* Status change */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button size="sm" variant="outline" disabled={isPending}>
                <RefreshCw className="mr-2 h-4 w-4" />
                Cambiar Estado
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center">
              {BULK_STATUS_OPTIONS.map((status) => (
                <DropdownMenuItem
                  key={status}
                  onClick={() => handleStatusChange(status)}
                >
                  {LOT_STATUS_LABELS[status]}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          <div className="h-5 w-px bg-border" />

          {/* Clear selection */}
          <Button
            size="sm"
            variant="ghost"
            onClick={onClearSelection}
            disabled={isPending}
          >
            <X className="mr-1 h-4 w-4" />
            Limpiar
          </Button>
        </div>
      </div>

      {/* Tag assignment dialog */}
      <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Asignar Etiquetas</DialogTitle>
            <DialogDescription>
              Las etiquetas seleccionadas se aplicaran a los {selectedCount}{" "}
              lotes seleccionados. Se reemplazaran las etiquetas existentes.
            </DialogDescription>
          </DialogHeader>

          <div className="max-h-64 overflow-y-auto space-y-1">
            {allTags.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                No hay etiquetas disponibles.
              </p>
            ) : (
              allTags.map((tag) => {
                const isSelected = selectedTagIds.has(tag.id);
                return (
                  <button
                    key={tag.id}
                    type="button"
                    className="flex w-full items-center gap-2 rounded-sm border px-3 py-2 text-left transition-colors hover:bg-muted/50"
                    style={
                      isSelected && tag.color
                        ? { borderColor: tag.color }
                        : undefined
                    }
                    onClick={() => toggleTag(tag.id)}
                  >
                    <div
                      className="flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border"
                      style={
                        isSelected
                          ? {
                              backgroundColor:
                                tag.color ?? "hsl(var(--primary))",
                              borderColor: tag.color ?? "hsl(var(--primary))",
                            }
                          : undefined
                      }
                    >
                      {isSelected && (
                        <Check className="h-3 w-3 text-white" />
                      )}
                    </div>
                    <Badge
                      variant="outline"
                      style={
                        tag.color
                          ? { borderColor: tag.color, color: tag.color }
                          : undefined
                      }
                    >
                      {tag.label}
                    </Badge>
                  </button>
                );
              })
            )}
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setTagDialogOpen(false)}
              disabled={isPendingTags}
            >
              Cancelar
            </Button>
            <Button onClick={handleApplyTags} disabled={isPendingTags}>
              {isPendingTags ? "Aplicando..." : "Aplicar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
