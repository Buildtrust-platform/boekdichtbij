/**
 * Locked time windows configuration
 * DO NOT MODIFY without approval
 */

export interface TimeWindow {
  id: string;
  label: string;
  startHour: number;
  endHour: number;
}

export const TIME_WINDOWS: readonly TimeWindow[] = [
  {
    id: "morning",
    label: "Ochtend (8:00 - 12:00)",
    startHour: 8,
    endHour: 12,
  },
  {
    id: "afternoon",
    label: "Middag (12:00 - 17:00)",
    startHour: 12,
    endHour: 17,
  },
  {
    id: "evening",
    label: "Avond (17:00 - 21:00)",
    startHour: 17,
    endHour: 21,
  },
] as const;

export const DAYS_OF_WEEK = [
  { id: "monday", label: "Maandag", shortLabel: "Ma" },
  { id: "tuesday", label: "Dinsdag", shortLabel: "Di" },
  { id: "wednesday", label: "Woensdag", shortLabel: "Wo" },
  { id: "thursday", label: "Donderdag", shortLabel: "Do" },
  { id: "friday", label: "Vrijdag", shortLabel: "Vr" },
  { id: "saturday", label: "Zaterdag", shortLabel: "Za" },
  { id: "sunday", label: "Zondag", shortLabel: "Zo" },
] as const;

export type DayId = (typeof DAYS_OF_WEEK)[number]["id"];
export type TimeWindowId = (typeof TIME_WINDOWS)[number]["id"];

export interface AvailabilitySlot {
  dayId: DayId;
  timeWindowId: TimeWindowId;
}

export function getTimeWindowById(id: TimeWindowId): TimeWindow | undefined {
  return TIME_WINDOWS.find((tw) => tw.id === id);
}

export function getDayById(id: DayId) {
  return DAYS_OF_WEEK.find((day) => day.id === id);
}

export function isWithinTimeWindow(
  date: Date,
  timeWindowId: TimeWindowId
): boolean {
  const timeWindow = getTimeWindowById(timeWindowId);
  if (!timeWindow) return false;

  const hour = date.getHours();
  return hour >= timeWindow.startHour && hour < timeWindow.endHour;
}

export function getCurrentTimeWindow(): TimeWindowId | null {
  const now = new Date();
  const hour = now.getHours();

  for (const tw of TIME_WINDOWS) {
    if (hour >= tw.startHour && hour < tw.endHour) {
      return tw.id as TimeWindowId;
    }
  }

  return null;
}

export function formatTimeWindow(timeWindowId: TimeWindowId): string {
  const tw = getTimeWindowById(timeWindowId);
  return tw?.label ?? "";
}
