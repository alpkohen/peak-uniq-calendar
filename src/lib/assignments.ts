import { addDays, format, parseISO } from "date-fns";
import { tr } from "date-fns/locale";
import { calendarDayLabel } from "./capacity";
import { isWorkday } from "./holidays";
import { bookingsInMonth, CALENDAR_START_MONTH } from "./slots";
import type { BookingWithClient } from "./types";

export type AssignmentBlock = {
  start: string;
  end: string;
  label: string;
  place: string | null;
  kind: "delivery" | "block";
  title: string | null;
};

function extractPlace(title: string | null): string | null {
  if (!title) return null;
  const match = title.match(/\s[—–]\s+(.+)$/);
  const place = match?.[1]?.trim();
  return place && place.length > 0 ? place : null;
}

function dayMeta(booking: BookingWithClient): {
  label: string;
  place: string | null;
  kind: "delivery" | "block";
  title: string | null;
} {
  return {
    label: calendarDayLabel(booking.kind, booking.raw_title, booking.client?.name),
    place: extractPlace(booking.raw_title),
    kind: booking.kind,
    title: booking.raw_title,
  };
}

function hasWorkdayBetween(start: string, end: string): boolean {
  let cursor = addDays(parseISO(`${start}T12:00:00`), 1);
  const last = parseISO(`${end}T12:00:00`);
  while (cursor < last) {
    if (isWorkday(format(cursor, "yyyy-MM-dd"))) return true;
    cursor = addDays(cursor, 1);
  }
  return false;
}

function formatDay(date: string): string {
  return format(parseISO(date), "d MMM", { locale: tr }).replace(".", "");
}

export function formatAssignmentDates(start: string, end: string): string {
  if (start === end) return formatDay(start);
  return `${formatDay(start)}–${formatDay(end)}`;
}

export function assignmentWorkdays(start: string, end: string): number {
  let count = 0;
  const last = parseISO(`${end}T12:00:00`);
  let cursor = parseISO(`${start}T12:00:00`);
  while (cursor <= last) {
    const date = format(cursor, "yyyy-MM-dd");
    if (isWorkday(date)) count += 1;
    cursor = addDays(cursor, 1);
  }
  return count;
}

function groupAssignmentBlocks(
  bookings: BookingWithClient[],
): AssignmentBlock[] {
  const byDate = new Map<string, ReturnType<typeof dayMeta>>();
  for (const booking of bookings) {
    if (booking.date < `${CALENDAR_START_MONTH}-01`) continue;
    const existing = byDate.get(booking.date);
    const meta = dayMeta(booking);
    if (!existing) {
      byDate.set(booking.date, meta);
      continue;
    }
    if (existing.kind === "delivery" && meta.kind === "block") continue;
    if (existing.label !== meta.label) {
      byDate.set(booking.date, {
        ...existing,
        label: `${existing.label} / ${meta.label}`,
      });
    }
  }

  const dates = Array.from(byDate.keys()).sort();
  const blocks: AssignmentBlock[] = [];

  for (const date of dates) {
    const meta = byDate.get(date)!;
    const prev = blocks[blocks.length - 1];
    const sameGroup =
      prev &&
      prev.label === meta.label &&
      prev.place === meta.place &&
      prev.kind === meta.kind &&
      !hasWorkdayBetween(prev.end, date);

    if (sameGroup) {
      prev.end = date;
      continue;
    }

    blocks.push({
      start: date,
      end: date,
      label: meta.label,
      place: meta.place,
      kind: meta.kind,
      title: meta.title,
    });
  }

  return blocks;
}

export function assignmentsForTrainerMonth(
  bookings: BookingWithClient[],
  trainerId: string,
  month: string,
): AssignmentBlock[] {
  return groupAssignmentBlocks(
    bookingsInMonth(
      bookings.filter((b) => b.trainer_id === trainerId),
      month,
    ),
  );
}

export function assignmentsForTrainer(
  bookings: BookingWithClient[],
  trainerId: string,
): AssignmentBlock[] {
  return groupAssignmentBlocks(
    bookings.filter((b) => b.trainer_id === trainerId),
  );
}
