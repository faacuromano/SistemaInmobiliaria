"use client";

import { useState, useMemo, useCallback } from "react";
import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";
import { CalendarDays, List, ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import { SigningsCalendar } from "./signings-calendar";
import { SigningsTable } from "./signings-table";
import { SigningsFilters } from "./signings-filters";
import { SigningFormDialog } from "./signing-form-dialog";
import type { BusinessHoursConfig } from "@/lib/business-hours";
import { getEnabledWeekDates } from "@/lib/business-hours";

type ViewMode = "calendar" | "list";

type SigningRow = {
  id: string;
  date: Date;
  time: string;
  endTime: string | null;
  lotInfo: string;
  clientName: string | null;
  lotNumbers: string | null;
  status: string;
  notes: string | null;
  development: { name: string } | null;
  seller: { name: string; lastName: string } | null;
  developmentId: string | null;
  sellerId: string | null;
};

interface Props {
  /** Filtered signings for list view */
  signings: SigningRow[];
  /** Week-scoped signings for calendar view */
  weekSignings: SigningRow[];
  canManage: boolean;
  developments: Array<{ id: string; name: string }>;
  sellers: Array<{ id: string; name: string }>;
  initialWeekStart: string;
  businessHours: BusinessHoursConfig;
}

/**
 * Get the Monday of the week containing the given date.
 */
function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekRange(monday: Date, enabledDays: number[]): string {
  const entries = getEnabledWeekDates(monday, enabledDays);
  if (entries.length === 0) return "";

  const first = entries[0].date;
  const last = entries[entries.length - 1].date;

  const months = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  const firstDay = first.getDate();
  const lastDay = last.getDate();

  if (first.getMonth() === last.getMonth()) {
    return `${firstDay} - ${lastDay} de ${months[first.getMonth()]} ${first.getFullYear()}`;
  }

  if (first.getFullYear() === last.getFullYear()) {
    return `${firstDay} ${months[first.getMonth()]} - ${lastDay} ${months[last.getMonth()]} ${first.getFullYear()}`;
  }

  return `${firstDay} ${months[first.getMonth()]} ${first.getFullYear()} - ${lastDay} ${months[last.getMonth()]} ${last.getFullYear()}`;
}

function toDateString(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function SigningsView({
  signings,
  weekSignings,
  canManage,
  developments,
  sellers,
  initialWeekStart,
  businessHours,
}: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [viewMode, setViewMode] = useState<ViewMode>("calendar");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [selectedSigning, setSelectedSigning] = useState<SigningRow | null>(null);
  const [createDefaults, setCreateDefaults] = useState<{ date: string; time: string } | null>(null);

  const weekStart = useMemo(() => {
    const d = new Date(initialWeekStart + "T00:00:00");
    return getMonday(d);
  }, [initialWeekStart]);

  const weekLabel = useMemo(() => formatWeekRange(weekStart, businessHours.enabledDays), [weekStart, businessHours.enabledDays]);

  const navigateWeek = useCallback(
    (newWeekStart: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set("week", newWeekStart);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams]
  );

  const handlePrevWeek = useCallback(() => {
    const prev = new Date(weekStart);
    prev.setDate(prev.getDate() - 7);
    navigateWeek(toDateString(prev));
  }, [weekStart, navigateWeek]);

  const handleNextWeek = useCallback(() => {
    const next = new Date(weekStart);
    next.setDate(next.getDate() + 7);
    navigateWeek(toDateString(next));
  }, [weekStart, navigateWeek]);

  const handleToday = useCallback(() => {
    const today = getMonday(new Date());
    navigateWeek(toDateString(today));
  }, [navigateWeek]);

  const isCurrentWeek = useMemo(() => {
    const today = getMonday(new Date());
    return toDateString(today) === toDateString(weekStart);
  }, [weekStart]);

  const handleSlotClick = useCallback(
    (date: Date, time: string) => {
      if (!canManage) return;
      setCreateDefaults({
        date: toDateString(date),
        time,
      });
      setCreateOpen(true);
    },
    [canManage]
  );

  const handleSigningClick = useCallback(
    (signing: SigningRow) => {
      if (!canManage) return;
      setSelectedSigning(signing);
      setEditOpen(true);
    },
    [canManage]
  );

  const editDefaultValues = selectedSigning
    ? {
        id: selectedSigning.id,
        date:
          typeof selectedSigning.date === "string"
            ? selectedSigning.date
            : new Date(selectedSigning.date).toISOString().split("T")[0],
        time: selectedSigning.time,
        endTime: selectedSigning.endTime,
        lotInfo: selectedSigning.lotInfo,
        clientName: selectedSigning.clientName,
        lotNumbers: selectedSigning.lotNumbers,
        developmentId: selectedSigning.developmentId,
        sellerId: selectedSigning.sellerId,
        status: selectedSigning.status,
        notes: selectedSigning.notes,
      }
    : undefined;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* View toggle */}
        <div className="flex rounded-sm border">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("calendar")}
            className={cn(
              "rounded-none rounded-l-sm px-2.5",
              viewMode === "calendar" && "bg-muted"
            )}
            title="Calendario"
          >
            <CalendarDays className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Calendario</span>
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode("list")}
            className={cn(
              "rounded-none rounded-r-sm px-2.5",
              viewMode === "list" && "bg-muted"
            )}
            title="Lista"
          >
            <List className="h-4 w-4" />
            <span className="ml-1.5 hidden sm:inline">Lista</span>
          </Button>
        </div>

        {/* Week navigation (only show in calendar mode) */}
        {viewMode === "calendar" && (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handlePrevWeek}
              title="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline ml-1">Anterior</span>
            </Button>

            <Button
              variant="outline"
              size="sm"
              onClick={handleToday}
              disabled={isCurrentWeek}
              className="min-w-[60px]"
            >
              Hoy
            </Button>

            <span className="text-sm font-medium text-center min-w-[220px]">
              {weekLabel}
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={handleNextWeek}
              title="Semana siguiente"
            >
              <span className="hidden sm:inline mr-1">Siguiente</span>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Status legend (calendar mode) */}
      {viewMode === "calendar" && (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
          <LegendDot color="bg-amber-500" label="Pendiente" />
          <LegendDot color="bg-blue-500" label="Confirmada" />
          <LegendDot color="bg-emerald-500" label="Completada" />
          <LegendDot color="bg-red-500" label="Cancelada" />
          <LegendDot color="bg-purple-500" label="Reprogramada" />
        </div>
      )}

      {/* Filters (list mode only) */}
      {viewMode === "list" && (
        <SigningsFilters developments={developments} />
      )}

      {/* Content */}
      {viewMode === "calendar" ? (
        <div className="border rounded-sm">
          <SigningsCalendar
            signings={weekSignings}
            weekStart={weekStart}
            canManage={canManage}
            onSlotClick={handleSlotClick}
            onSigningClick={handleSigningClick}
            businessHours={businessHours}
          />
        </div>
      ) : (
        <SigningsTable
          signings={signings}
          canManage={canManage}
          developments={developments}
          sellers={sellers}
        />
      )}

      {/* Create dialog (from empty slot click) */}
      {canManage && (
        <SigningFormDialog
          open={createOpen}
          onOpenChange={(open) => {
            setCreateOpen(open);
            if (!open) setCreateDefaults(null);
          }}
          developments={developments}
          sellers={sellers}
          defaultValues={
            createDefaults
              ? {
                  id: "",
                  date: createDefaults.date,
                  time: createDefaults.time,
                  endTime: null,
                  lotInfo: "",
                  clientName: null,
                  lotNumbers: null,
                  developmentId: null,
                  sellerId: null,
                  status: "PENDIENTE",
                  notes: null,
                }
              : undefined
          }
        />
      )}

      {/* Edit dialog (from signing click) */}
      {canManage && (
        <SigningFormDialog
          open={editOpen}
          onOpenChange={(open) => {
            setEditOpen(open);
            if (!open) setSelectedSigning(null);
          }}
          developments={developments}
          sellers={sellers}
          defaultValues={editDefaultValues}
        />
      )}
    </div>
  );
}

function LegendDot({ color, label }: { color: string; label: string }) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={cn("inline-block h-2 w-2 rounded-full", color)} />
      <span>{label}</span>
    </div>
  );
}
