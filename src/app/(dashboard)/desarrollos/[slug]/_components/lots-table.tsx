"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { DataTable, type Column } from "@/components/shared/data-table";
import { StatusBadge } from "@/components/shared/status-badge";
import { ConfirmDialog } from "@/components/shared/confirm-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { MoreHorizontal, Pencil, Trash2, Tags } from "lucide-react";
import { deleteLot } from "@/server/actions/lot.actions";
import { LOT_STATUS_LABELS, LOT_STATUS_COLORS } from "@/lib/constants";
import { formatCurrency } from "@/lib/format";
import { LotTagsDialog } from "./lot-tags-dialog";
import { useState } from "react";
import type { LotRow, TagWithCount } from "./lots-section";

interface Props {
  lots: LotRow[];
  canManage: boolean;
  canManageLots: boolean;
  allTags: TagWithCount[];
  onEdit: (lot: LotRow) => void;
  selectedIds?: Set<string>;
  onToggleSelect?: (id: string) => void;
  onToggleAll?: () => void;
}

export function LotsTable({
  lots,
  canManage,
  canManageLots,
  allTags,
  onEdit,
  selectedIds,
  onToggleSelect,
  onToggleAll,
}: Props) {
  const router = useRouter();
  const [tagDialogLot, setTagDialogLot] = useState<LotRow | null>(null);
  const headerCheckboxRef = useRef<HTMLInputElement>(null);

  async function handleDelete(id: string) {
    const result = await deleteLot(id);
    if (result.success) {
      toast.success("Lote eliminado");
      router.refresh();
    } else {
      toast.error(result.error);
    }
  }

  const showCheckboxes = canManageLots && selectedIds && onToggleSelect && onToggleAll;

  const allSelected = showCheckboxes && lots.length > 0 && selectedIds.size === lots.length;
  const someSelected = showCheckboxes && selectedIds.size > 0 && selectedIds.size < lots.length;

  // Update indeterminate state via ref (cannot set via JSX attribute)
  if (headerCheckboxRef.current) {
    headerCheckboxRef.current.indeterminate = !!someSelected;
  }

  const columns: Column<LotRow>[] = [];

  if (showCheckboxes) {
    columns.push({
      key: "select",
      label: "",
      className: "w-10",
      render: (lot) => (
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
          checked={selectedIds.has(lot.id)}
          onChange={() => onToggleSelect(lot.id)}
          onClick={(e) => e.stopPropagation()}
        />
      ),
    });
  }

  columns.push(
    {
      key: "lotNumber",
      label: "Lote",
      render: (lot) => <span className="font-medium">{lot.lotNumber}</span>,
    },
    {
      key: "block",
      label: "Manzana",
      render: (lot) => lot.block ?? "---",
    },
    {
      key: "area",
      label: "Superficie",
      render: (lot) => (lot.area ? `${lot.area} m2` : "---"),
    },
    {
      key: "listPrice",
      label: "Precio Lista",
      render: (lot) =>
        lot.listPrice ? formatCurrency(lot.listPrice, "USD") : "---",
    },
    {
      key: "status",
      label: "Estado",
      render: (lot) => (
        <StatusBadge
          label={LOT_STATUS_LABELS[lot.status]}
          variant={LOT_STATUS_COLORS[lot.status]}
        />
      ),
    },
    {
      key: "tags",
      label: "Etiquetas",
      render: (lot) => (
        <div className="flex flex-wrap gap-1">
          {lot.tags.length > 0 ? (
            lot.tags.map((tag) => (
              <Badge
                key={tag.id}
                variant="outline"
                className="text-[11px] px-1.5 py-0"
                style={
                  tag.color
                    ? { borderColor: tag.color, color: tag.color }
                    : undefined
                }
              >
                {tag.label}
              </Badge>
            ))
          ) : (
            <span className="text-muted-foreground text-xs">---</span>
          )}
        </div>
      ),
    },
    {
      key: "buyer",
      label: "Comprador",
      render: (lot) =>
        lot.sale?.person
          ? `${lot.sale.person.firstName} ${lot.sale.person.lastName}`
          : "---",
    }
  );

  if (canManage) {
    columns.push({
      key: "actions",
      label: "",
      className: "w-12",
      render: (lot) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => onEdit(lot)}>
              <Pencil className="mr-2 h-4 w-4" />
              Editar
            </DropdownMenuItem>
            {canManageLots && (
              <DropdownMenuItem onClick={() => setTagDialogLot(lot)}>
                <Tags className="mr-2 h-4 w-4" />
                Etiquetas
              </DropdownMenuItem>
            )}
            {!lot.sale && (
              <ConfirmDialog
                title="Eliminar lote"
                description={`Estas seguro de eliminar el lote ${lot.lotNumber}?`}
                onConfirm={() => handleDelete(lot.id)}
                trigger={
                  <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                    <Trash2 className="mr-2 h-4 w-4" />
                    Eliminar
                  </DropdownMenuItem>
                }
              />
            )}
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    });
  }

  // The DataTable header uses the column label. For the checkbox column header,
  // we need a custom approach. We'll override the label with a header checkbox
  // by using a render trick — but DataTable only renders labels as strings in TableHead.
  // Instead, we set the label to an empty string and handle the header checkbox
  // by wrapping DataTable. Actually, let's use the label as JSX isn't supported.
  // We'll add a select-all row or handle it differently.

  // Since the Column label is a string, we'll render the header checkbox
  // as part of a wrapper. But that's complex. Instead, let's make the first
  // row checkbox act as "select all" indicator by using the header label.
  // The simplest approach: replace the select column label with a custom render
  // But Column.label is string only. Let me handle it by not using the header
  // checkbox in the Column definition, and instead wrapping the DataTable.

  return (
    <>
      {showCheckboxes ? (
        <DataTableWithHeaderCheckbox
          columns={columns}
          data={lots}
          allSelected={!!allSelected}
          someSelected={!!someSelected}
          onToggleAll={onToggleAll}
          selectedIds={selectedIds}
        />
      ) : (
        <DataTable
          columns={columns}
          data={lots}
          emptyTitle="Sin lotes"
          emptyDescription="Este desarrollo no tiene lotes cargados."
        />
      )}
      {canManageLots && tagDialogLot && (
        <LotTagsDialog
          open={!!tagDialogLot}
          onOpenChange={(open) => { if (!open) setTagDialogLot(null); }}
          lot={tagDialogLot}
          allTags={allTags}
        />
      )}
    </>
  );
}

/**
 * Wraps DataTable to inject a header checkbox for select-all functionality.
 * This is needed because DataTable Column.label only accepts strings.
 */
function DataTableWithHeaderCheckbox({
  columns,
  data,
  allSelected,
  someSelected,
  onToggleAll,
  selectedIds,
}: {
  columns: Column<LotRow>[];
  data: LotRow[];
  allSelected: boolean;
  someSelected: boolean;
  onToggleAll: () => void;
  selectedIds: Set<string>;
}) {
  const checkboxRef = useRef<HTMLInputElement>(null);

  // Set indeterminate via effect-like pattern
  if (checkboxRef.current) {
    checkboxRef.current.indeterminate = someSelected;
  }

  return (
    <div className="relative">
      {/* Header checkbox overlay positioned over the first th */}
      {data.length > 0 && (
        <div className="absolute left-0 top-0 z-10 flex h-11 w-10 items-center justify-center">
          <input
            ref={checkboxRef}
            type="checkbox"
            className="h-4 w-4 rounded border-gray-300 accent-primary cursor-pointer"
            checked={allSelected}
            onChange={onToggleAll}
          />
        </div>
      )}
      <DataTable
        columns={columns}
        data={data}
        emptyTitle="Sin lotes"
        emptyDescription="Este desarrollo no tiene lotes cargados."
        rowClassName={(lot) =>
          selectedIds.has(lot.id) ? "bg-primary/5" : ""
        }
      />
    </div>
  );
}
