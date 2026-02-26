export interface BreakPeriod {
  label: string;
  startTime: string; // HH:MM format
  endTime: string; // HH:MM format
}

export interface BusinessHoursConfig {
  openingTime: string; // HH:MM format
  closingTime: string; // HH:MM format
  breaks: BreakPeriod[];
  enabledDays: number[]; // 0=Sun, 1=Mon, ..., 6=Sat
}

export const DEFAULT_BUSINESS_HOURS: BusinessHoursConfig = {
  openingTime: "09:00",
  closingTime: "17:00",
  breaks: [
    {
      label: "Mediodia",
      startTime: "12:00",
      endTime: "14:00",
    },
  ],
  enabledDays: [1, 2, 3, 4, 5], // Mon-Fri
};

// --- Calendar segment types (discriminated union) ---

export interface CalendarSlotGroup {
  type: "slots";
  slots: string[]; // HH:MM time strings
}

export interface CalendarBreakGroup {
  type: "break";
  label: string;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
}

export type CalendarSegment = CalendarSlotGroup | CalendarBreakGroup;

// --- Internal helpers ---

function timeToMinutes(time: string): number {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/**
 * Generate 30-minute interval time strings from `from` (inclusive) to `to` (exclusive).
 */
function generateSlotRange(from: string, to: string): string[] {
  const fromMin = timeToMinutes(from);
  const toMin = timeToMinutes(to);
  const slots: string[] = [];
  for (let t = fromMin; t < toMin; t += 30) {
    slots.push(minutesToTime(t));
  }
  return slots;
}

// --- Calendar generation ---

/**
 * Generates calendar segments (slot groups and break separators)
 * from business hours configuration. Slots are 30-minute intervals.
 *
 * Walks from openingTime to closingTime, inserting break separators
 * between groups of time slots. Empty slot groups are filtered out.
 */
export function generateCalendarSegments(config: BusinessHoursConfig): CalendarSegment[] {
  const openMin = timeToMinutes(config.openingTime);
  const closeMin = timeToMinutes(config.closingTime);

  // Sort breaks by startTime ascending (string comparison works for zero-padded HH:MM)
  const sortedBreaks = [...config.breaks].sort(
    (a, b) => a.startTime.localeCompare(b.startTime)
  );

  const segments: CalendarSegment[] = [];
  let cursor = config.openingTime;
  let cursorMin = openMin;

  for (const brk of sortedBreaks) {
    const breakStartMin = timeToMinutes(brk.startTime);
    const breakEndMin = timeToMinutes(brk.endTime);

    // Skip breaks entirely outside the business hours window
    if (breakEndMin <= openMin || breakStartMin >= closeMin) continue;

    // Generate slot group from cursor to break start
    if (cursorMin < breakStartMin) {
      const slots = generateSlotRange(cursor, brk.startTime);
      if (slots.length > 0) {
        segments.push({ type: "slots", slots });
      }
    }

    // Insert break separator
    segments.push({
      type: "break",
      label: brk.label,
      startTime: brk.startTime,
      endTime: brk.endTime,
    });

    // Advance cursor past the break
    const newCursorMin = Math.max(cursorMin, breakEndMin);
    cursor = minutesToTime(newCursorMin);
    cursorMin = newCursorMin;
  }

  // Generate remaining slots after last break
  if (cursorMin < closeMin) {
    const slots = generateSlotRange(cursor, config.closingTime);
    if (slots.length > 0) {
      segments.push({ type: "slots", slots });
    }
  }

  return segments;
}

// --- Day names and enabled-day utilities ---

/**
 * Map of JS day-of-week number (0=Sunday) to Spanish label (no accents).
 */
export const DAY_NAMES: Record<number, string> = {
  0: "Domingo",
  1: "Lunes",
  2: "Martes",
  3: "Miercoles",
  4: "Jueves",
  5: "Viernes",
  6: "Sabado",
};

/**
 * Get the Spanish day label for a given JS day-of-week number.
 */
export function getDayLabel(dayOfWeek: number): string {
  return DAY_NAMES[dayOfWeek] || "";
}

/**
 * Maps enabledDays config to actual Date objects for a given week,
 * along with day-of-week number and Spanish label.
 *
 * weekStart must be a Monday (as guaranteed by getMonday()).
 * Returns entries sorted by date (ascending).
 */
export function getEnabledWeekDates(
  weekStart: Date,
  enabledDays: number[]
): { date: Date; dayOfWeek: number; label: string }[] {
  const sorted = [...enabledDays].sort((a, b) => {
    // Sort by Monday offset so results come in week order
    const offsetA = a === 0 ? 6 : a - 1;
    const offsetB = b === 0 ? 6 : b - 1;
    return offsetA - offsetB;
  });

  return sorted.map((day) => {
    // day 1 (Mon) => offset 0, day 2 (Tue) => offset 1, ..., day 0 (Sun) => offset 6
    const offset = day === 0 ? 6 : day - 1;
    const d = new Date(weekStart);
    d.setDate(d.getDate() + offset);
    return { date: d, dayOfWeek: day, label: DAY_NAMES[day] };
  });
}

// --- Slot time helpers ---

/**
 * Extracts all time slot strings from calendar segments into a Set
 * for O(1) out-of-hours detection lookups.
 */
export function getAllSlotTimes(segments: CalendarSegment[]): Set<string> {
  const times = new Set<string>();
  for (const seg of segments) {
    if (seg.type === "slots") {
      for (const t of seg.slots) {
        times.add(t);
      }
    }
  }
  return times;
}
