"use client";

import { useMemo } from "react";
import { cn } from "@/lib/utils";
import {
  SIGNING_STATUS_LABELS,
} from "@/lib/constants";
import type { SigningStatus } from "@/types/enums";
import type { BusinessHoursConfig } from "@/lib/business-hours";
import {
  generateCalendarSegments,
  getEnabledWeekDates,
  getAllSlotTimes,
} from "@/lib/business-hours";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const STATUS_BG: Record<string, string> = {
  PENDIENTE: "bg-amber-100 border-amber-300 text-amber-900",
  CONFIRMADA: "bg-blue-100 border-blue-300 text-blue-900",
  COMPLETADA: "bg-emerald-100 border-emerald-300 text-emerald-900",
  CANCELADA: "bg-red-100 border-red-300 text-red-900 line-through opacity-60",
  REPROGRAMADA: "bg-purple-100 border-purple-300 text-purple-900",
};

const STATUS_DOT: Record<string, string> = {
  PENDIENTE: "bg-amber-500",
  CONFIRMADA: "bg-blue-500",
  COMPLETADA: "bg-emerald-500",
  CANCELADA: "bg-red-500",
  REPROGRAMADA: "bg-purple-500",
};

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
  signings: SigningRow[];
  weekStart: Date;
  canManage: boolean;
  onSlotClick?: (date: Date, time: string) => void;
  onSigningClick?: (signing: SigningRow) => void;
  businessHours: BusinessHoursConfig;
}

function formatShortDate(date: Date): string {
  const day = date.getDate();
  const months = [
    "Ene", "Feb", "Mar", "Abr", "May", "Jun",
    "Jul", "Ago", "Sep", "Oct", "Nov", "Dic",
  ];
  return `${day} ${months[date.getMonth()]}`;
}

function isSameDay(d1: Date, d2: Date): boolean {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

function isToday(d: Date): boolean {
  return isSameDay(d, new Date());
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

/** Extract YYYY-MM-DD from a signing date using UTC to avoid timezone date shift */
function utcDateStr(date: Date | string): string {
  const d = new Date(date);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
}

export function SigningsCalendar({
  signings,
  weekStart,
  canManage,
  onSlotClick,
  onSigningClick,
  businessHours,
}: Props) {
  const weekDateEntries = useMemo(
    () => getEnabledWeekDates(weekStart, businessHours.enabledDays),
    [weekStart, businessHours.enabledDays]
  );

  // Extract bare Date array for grid rendering
  const weekDates = useMemo(
    () => weekDateEntries.map((e) => e.date),
    [weekDateEntries]
  );

  const segments = useMemo(
    () => generateCalendarSegments(businessHours),
    [businessHours]
  );

  const dayCount = weekDates.length;

  // Collect all configured time slots for out-of-hours detection
  const configuredTimes = useMemo(
    () => getAllSlotTimes(segments),
    [segments]
  );

  // Build a lookup map: "YYYY-MM-DD|HH:MM" -> SigningRow[]
  // Uses UTC date extraction to avoid timezone date-shift (signing dates are stored as UTC midnight)
  const slotMap = useMemo(() => {
    const map = new Map<string, SigningRow[]>();
    for (const signing of signings) {
      const dateStr = utcDateStr(signing.date);
      const key = `${dateStr}|${signing.time}`;
      const existing = map.get(key) || [];
      existing.push(signing);
      map.set(key, existing);
    }
    return map;
  }, [signings]);

  // Detect out-of-hours signings for each date (UTC extraction to match slotMap keys)
  const outOfHoursSignings = useMemo(() => {
    const result = new Map<string, SigningRow[]>();
    for (const signing of signings) {
      if (!configuredTimes.has(signing.time)) {
        const dateStr = utcDateStr(signing.date);
        const existing = result.get(dateStr) || [];
        existing.push(signing);
        result.set(dateStr, existing);
      }
    }
    return result;
  }, [signings, configuredTimes]);

  const hasOutOfHours = outOfHoursSignings.size > 0;

  // Use inline style for dynamic grid columns (Tailwind purges dynamic classes)
  const gridStyle = { gridTemplateColumns: `80px repeat(${dayCount}, 1fr)` };

  return (
    <TooltipProvider delayDuration={200}>
      <div className="overflow-x-auto">
        <div className="min-w-[700px]">
          {/* Header row */}
          <div className="grid border-b border-border" style={gridStyle}>
            <div className="p-2 text-xs font-medium text-muted-foreground border-r border-border" />
            {weekDateEntries.map((entry, i) => (
              <div
                key={i}
                className={cn(
                  "p-2 text-center border-r border-border last:border-r-0",
                  isToday(entry.date) && "bg-primary/5"
                )}
              >
                <div className="text-xs font-medium text-muted-foreground">
                  {entry.label}
                </div>
                <div
                  className={cn(
                    "text-sm font-semibold",
                    isToday(entry.date) && "text-primary"
                  )}
                >
                  {formatShortDate(entry.date)}
                </div>
              </div>
            ))}
          </div>

          {/* Dynamic segments */}
          {segments.map((segment, segIdx) => {
            if (segment.type === "break") {
              return (
                <div
                  key={`break-${segIdx}`}
                  className="grid border-y-2 border-border/60"
                  style={gridStyle}
                >
                  <div className="p-1 text-[10px] font-medium text-muted-foreground/60 text-center border-r border-border">
                    {segment.label || "Descanso"} {segment.startTime}-{segment.endTime}
                  </div>
                  {weekDates.map((_, i) => (
                    <div
                      key={i}
                      className="p-1 border-r border-border last:border-r-0 bg-muted/30"
                    />
                  ))}
                </div>
              );
            }

            return segment.slots.map((time) => (
              <CalendarRow
                key={time}
                time={time}
                weekDates={weekDates}
                slotMap={slotMap}
                canManage={canManage}
                onSlotClick={onSlotClick}
                onSigningClick={onSigningClick}
                gridStyle={gridStyle}
              />
            ));
          })}

          {/* Out-of-hours signings */}
          {hasOutOfHours && (
            <>
              <div
                className="grid border-y-2 border-dashed border-amber-400/60"
                style={gridStyle}
              >
                <div className="p-1 text-[10px] font-medium text-amber-600 text-center border-r border-border">
                  Fuera de horario
                </div>
                {weekDates.map((_, i) => (
                  <div
                    key={i}
                    className="p-1 border-r border-border last:border-r-0 bg-amber-50/50"
                  />
                ))}
              </div>
              {/* Render out-of-hours signings grouped by time */}
              {(() => {
                const allOOH: { time: string; signing: SigningRow }[] = [];
                for (const [, rows] of outOfHoursSignings) {
                  for (const s of rows) allOOH.push({ time: s.time, signing: s });
                }
                const uniqueTimes = [...new Set(allOOH.map((x) => x.time))].sort();
                return uniqueTimes.map((time) => (
                  <CalendarRow
                    key={`ooh-${time}`}
                    time={time}
                    weekDates={weekDates}
                    slotMap={slotMap}
                    canManage={canManage}
                    onSlotClick={onSlotClick}
                    onSigningClick={onSigningClick}
                    gridStyle={gridStyle}
                    outOfHours
                  />
                ));
              })()}
            </>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}

// ---- Row component ----

interface CalendarRowProps {
  time: string;
  weekDates: Date[];
  slotMap: Map<string, SigningRow[]>;
  canManage: boolean;
  onSlotClick?: (date: Date, time: string) => void;
  onSigningClick?: (signing: SigningRow) => void;
  gridStyle: React.CSSProperties;
  outOfHours?: boolean;
}

function CalendarRow({
  time,
  weekDates,
  slotMap,
  canManage,
  onSlotClick,
  onSigningClick,
  gridStyle,
  outOfHours,
}: CalendarRowProps) {
  return (
    <div className={cn("grid border-b border-border", outOfHours && "bg-amber-50/30 border-dashed")} style={gridStyle}>
      {/* Time label */}
      <div className={cn(
        "p-2 text-xs font-medium text-right pr-3 border-r border-border flex items-center justify-end gap-1",
        outOfHours ? "text-amber-600" : "text-muted-foreground"
      )}>
        {outOfHours && <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500 shrink-0" />}
        {time}
      </div>

      {/* Day cells */}
      {weekDates.map((date, dayIndex) => {
        const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
        const key = `${dateStr}|${time}`;
        const signingsInSlot = slotMap.get(key) || [];

        return (
          <div
            key={dayIndex}
            className={cn(
              "min-h-[52px] p-1 border-r border-border last:border-r-0 transition-colors",
              isToday(date) && "bg-primary/5",
              outOfHours && "bg-amber-50/30",
              signingsInSlot.length === 0 && canManage && !outOfHours && "hover:bg-muted/50 cursor-pointer"
            )}
            onClick={() => {
              if (signingsInSlot.length === 0 && canManage && !outOfHours && onSlotClick) {
                onSlotClick(date, time);
              }
            }}
          >
            {signingsInSlot.map((signing) => (
              <SigningCell
                key={signing.id}
                signing={signing}
                onClick={() => onSigningClick?.(signing)}
              />
            ))}
          </div>
        );
      })}
    </div>
  );
}

// ---- Cell component ----

interface SigningCellProps {
  signing: SigningRow;
  onClick?: () => void;
}

function SigningCell({ signing, onClick }: SigningCellProps) {
  const statusColors = STATUS_BG[signing.status] || STATUS_BG.PENDIENTE;
  const dotColor = STATUS_DOT[signing.status] || STATUS_DOT.PENDIENTE;

  const sellerName = signing.seller
    ? `${signing.seller.name} ${signing.seller.lastName}`.trim()
    : null;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClick?.();
          }}
          className={cn(
            "w-full text-left rounded-sm border p-1.5 mb-0.5 text-[11px] leading-tight transition-shadow hover:shadow-sm",
            statusColors
          )}
        >
          <div className="flex items-center gap-1">
            <span
              className={cn("inline-block h-1.5 w-1.5 rounded-full shrink-0", dotColor)}
            />
            <span className="font-semibold truncate">
              {truncate(signing.lotInfo, 16)}
            </span>
          </div>
          {signing.clientName && (
            <div className="truncate opacity-80 mt-0.5">
              {truncate(signing.clientName, 18)}
            </div>
          )}
        </button>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-xs">
        <div className="space-y-1 text-xs">
          <div className="font-semibold">{signing.lotInfo}</div>
          {signing.clientName && <div>Cliente: {signing.clientName}</div>}
          {signing.development && <div>Desarrollo: {signing.development.name}</div>}
          {sellerName && <div>Vendedor: {sellerName}</div>}
          <div>
            Estado: {SIGNING_STATUS_LABELS[signing.status as SigningStatus]}
          </div>
          {signing.time && (
            <div>
              Horario: {signing.time}
              {signing.endTime ? ` - ${signing.endTime}` : ""}
            </div>
          )}
          {signing.notes && (
            <div className="text-muted-foreground italic">{signing.notes}</div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
