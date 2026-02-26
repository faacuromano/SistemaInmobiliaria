"use client";

import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { EmptyState } from "./empty-state";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  key: string;
  label: string;
  className?: string;
  render: (item: T) => React.ReactNode;
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  pageSize?: number;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  rowClassName?: (item: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  pageSize = 20,
  emptyTitle = "Sin resultados",
  emptyDescription = "No se encontraron registros.",
  emptyAction,
  rowClassName,
}: DataTableProps<T>) {
  const [currentPage, setCurrentPage] = useState(0);

  if (data.length === 0) {
    return (
      <EmptyState
        title={emptyTitle}
        description={emptyDescription}
      >
        {emptyAction}
      </EmptyState>
    );
  }

  const totalPages = Math.ceil(data.length / pageSize);
  const needsPagination = totalPages > 1;
  const paginatedData = needsPagination
    ? data.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : data;

  return (
    <div className="space-y-2">
      <div className="rounded-md border bg-card shadow-sm overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((col) => (
                <TableHead key={col.key} className={col.className}>
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {paginatedData.map((item, index) => (
              <TableRow key={index} className={rowClassName?.(item, currentPage * pageSize + index)}>
                {columns.map((col) => (
                  <TableCell key={col.key} className={col.className}>
                    {col.render(item)}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {needsPagination && (
        <div className="flex items-center justify-between text-sm text-muted-foreground px-1">
          <span>
            {currentPage * pageSize + 1}-{Math.min((currentPage + 1) * pageSize, data.length)} de {data.length}
          </span>
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage((p) => Math.max(0, p - 1))}
              disabled={currentPage === 0}
            >
              <ChevronLeft />
            </Button>
            <span className="px-2 tabular-nums">
              {currentPage + 1} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="icon-xs"
              onClick={() => setCurrentPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={currentPage >= totalPages - 1}
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
