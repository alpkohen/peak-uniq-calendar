import { parseClientFromTitle } from "./capacity";
import { CALENDAR_START_MONTH } from "./slots";
import type { BookingWithClient, Trainer } from "./types";

export type MatrixCell = {
  deliveryDays: number;
  programs: string[];
};

export type MatrixRow = {
  key: string;
  label: string;
  cells: Record<string, MatrixCell>;
  totalDays: number;
};

function rowKeyForBooking(booking: BookingWithClient): string {
  if (booking.client?.id) return `client:${booking.client.id}`;
  const parsed = parseClientFromTitle(booking.raw_title ?? "");
  const label = booking.client?.name ?? parsed ?? "Atanmamış";
  return `label:${label}`;
}

function rowLabelForBooking(booking: BookingWithClient): string {
  return (
    booking.client?.name ??
    parseClientFromTitle(booking.raw_title ?? "") ??
    "Atanmamış"
  );
}

export function buildClientTrainerMatrix(
  trainers: Trainer[],
  bookings: BookingWithClient[],
  month?: string,
): MatrixRow[] {
  const filtered = month
    ? bookings.filter((b) => b.date.startsWith(month))
    : bookings;

  const delivery = filtered.filter((b) => b.kind === "delivery");
  const rowMap = new Map<string, MatrixRow>();
  const datesByCell = new Map<string, Set<string>>();
  const programsByCell = new Map<string, Set<string>>();

  for (const booking of delivery) {
    const rowKey = rowKeyForBooking(booking);
    const label = rowLabelForBooking(booking);

    if (!rowMap.has(rowKey)) {
      rowMap.set(rowKey, {
        key: rowKey,
        label,
        cells: Object.fromEntries(
          trainers.map((t) => [t.id, { deliveryDays: 0, programs: [] }]),
        ),
        totalDays: 0,
      });
    }

    const cellKey = `${rowKey}::${booking.trainer_id}`;
    const dates = datesByCell.get(cellKey) ?? new Set<string>();
    dates.add(booking.date);
    datesByCell.set(cellKey, dates);

    const programs = programsByCell.get(cellKey) ?? new Set<string>();
    if (booking.raw_title) programs.add(booking.raw_title);
    programsByCell.set(cellKey, programs);
  }

  for (const row of rowMap.values()) {
    const allDates = new Set<string>();
    for (const trainer of trainers) {
      const cellKey = `${row.key}::${trainer.id}`;
      const dates = datesByCell.get(cellKey);
      if (!dates) continue;
      row.cells[trainer.id] = {
        deliveryDays: dates.size,
        programs: Array.from(programsByCell.get(cellKey) ?? []).slice(0, 3),
      };
      for (const d of dates) allDates.add(d);
    }
    row.totalDays = allDates.size;
  }

  return Array.from(rowMap.values()).sort((a, b) => {
    if (b.totalDays !== a.totalDays) return b.totalDays - a.totalDays;
    return a.label.localeCompare(b.label, "tr-TR");
  });
}

export function monthsFromBookings(bookings: BookingWithClient[]): string[] {
  const months = new Set<string>();
  for (const b of bookings) {
    const month = b.date.slice(0, 7);
    if (month >= CALENDAR_START_MONTH) months.add(month);
  }
  return Array.from(months).sort();
}
