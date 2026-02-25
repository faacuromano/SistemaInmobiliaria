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
