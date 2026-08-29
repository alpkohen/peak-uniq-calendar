import {
  addDays,
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
  startOfMonth,
} from "date-fns";
import type { GoogleCalendarEvent, Slot } from "./types";
import { isWorkday } from "./holidays";

const AM_CUTOFF = { hour: 13, minute: 30 };
const PM_START = { hour: 12, minute: 0 };
const FULL_DAY_START = { hour: 9, minute: 0 };
const FULL_DAY_END = { hour: 18, minute: 0 };

function parseTime(dateTime?: string): { hour: number; minute: number } | null {
  if (!dateTime) return null;
  const date = parseISO(dateTime);
  return { hour: date.getHours(), minute: date.getMinutes() };
}

function compareTime(
  a: { hour: number; minute: number },
  b: { hour: number; minute: number },
): number {
  if (a.hour !== b.hour) return a.hour - b.hour;
  return a.minute - b.minute;
}

function slotsForTimedEvent(event: GoogleCalendarEvent): Slot[] {
  const start = parseTime(event.start.dateTime);
  const end = parseTime(event.end.dateTime);

  if (!start || !end) return ["am", "pm"];

  const isFullDaySpan =
    compareTime(start, FULL_DAY_START) <= 0 &&
    compareTime(end, FULL_DAY_END) >= 0;

  if (isFullDaySpan) return ["am", "pm"];
  if (compareTime(end, AM_CUTOFF) <= 0) return ["am"];
  if (compareTime(start, PM_START) >= 0) return ["pm"];

  return ["am", "pm"];
}

function eventDateRange(event: GoogleCalendarEvent): string[] {
  if (event.start.date) {
    const start = parseISO(event.start.date);
    const endExclusive = event.end.date
      ? parseISO(event.end.date)
      : addDays(start, 1);

    return eachDayOfInterval({
      start,
      end: addDays(endExclusive, -1),
    }).map((d) => format(d, "yyyy-MM-dd"));
  }

  if (event.start.dateTime) {
    return [format(parseISO(event.start.dateTime), "yyyy-MM-dd")];
  }

  return [];
}

export type ExtractedSlot = {
  date: string;
  slot: Slot;
};

export function extractSlotsFromEvent(
  event: GoogleCalendarEvent,
): ExtractedSlot[] {
  if (event.status === "cancelled") return [];

  const dates = eventDateRange(event);
  const isAllDay = Boolean(event.start.date);
  const timedSlots = isAllDay ? (["am", "pm"] as Slot[]) : slotsForTimedEvent(event);

  const result: ExtractedSlot[] = [];

  for (const date of dates) {
    if (!isWorkday(date)) continue;

    const slots = isAllDay || dates.length > 1 ? (["am", "pm"] as Slot[]) : timedSlots;
    for (const slot of slots) {
      result.push({ date, slot });
    }
  }

  return result;
}

export function monthKey(date: Date): string {
  return format(startOfMonth(date), "yyyy-MM");
}

export const CALENDAR_START_MONTH = "2026-09";

export function clampCalendarMonth(month: string): string {
  return month < CALENDAR_START_MONTH ? CALENDAR_START_MONTH : month;
}

export function defaultCalendarMonth(): string {
  const now = monthKey(new Date());
  return clampCalendarMonth(now < CALENDAR_START_MONTH ? CALENDAR_START_MONTH : now);
}

export function monthRange(monthsAhead = 12): string[] {
  const now = new Date();
  const keys: string[] = [];
  for (let i = 0; i < monthsAhead; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
    keys.push(monthKey(d));
  }
  return keys;
}

/** Eylül 2026'dan itibaren; geçmiş aylar gösterilmez. */
export function monthRangeFromBookings(
  bookings: { date: string }[],
  monthsAhead = 6,
): string[] {
  const min = parseISO(`${CALENDAR_START_MONTH}-01`);
  let max = addMonths(startOfMonth(new Date()), monthsAhead);

  for (const booking of bookings) {
    const day = startOfMonth(parseISO(booking.date));
    if (day > max) max = day;
  }

  const keys: string[] = [];
  let current = min;
  while (current <= max) {
    keys.push(monthKey(current));
    current = addMonths(current, 1);
  }
  return keys;
}

export function bookingsInMonth<T extends { date: string }>(
  bookings: T[],
  month: string,
): T[] {
  const start = parseISO(`${month}-01`);
  const end = endOfMonth(start);
  const startStr = format(start, "yyyy-MM-dd");
  const endStr = format(end, "yyyy-MM-dd");

  return bookings.filter((b) => b.date >= startStr && b.date <= endStr);
}
