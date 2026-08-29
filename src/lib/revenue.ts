import {
  assignmentWorkdays,
  assignmentsForTrainerMonth,
  type AssignmentBlock,
} from "./assignments";
import { calendarDayLabel, matchClient, parseClientFromTitle } from "./capacity";
import {
  calculatePeakRevenue,
  calculateTrainerFee,
} from "./pricing";
import { compareTrainerNames } from "./trainer-names";
import type {
  BookingWithClient,
  Client,
  ClientPricing,
  Trainer,
} from "./types";

export type RevenueCell = {
  amount: number;
  days: number;
  pricedDays: number;
};

export type RevenueBreakdownItem = {
  label: string;
  amount: number;
};

export type RevenueRow = {
  trainerId: string;
  trainerName: string;
  byMonth: Record<string, RevenueCell>;
  breakdownByMonth: Record<string, RevenueBreakdownItem[]>;
  total: RevenueCell;
};

export type RevenueGrid = {
  months: string[];
  rows: RevenueRow[];
  columnTotals: Record<string, RevenueCell>;
  grandTotal: RevenueCell;
};

type PricingLookup = Map<string, ClientPricing>;

function normalizeKey(value: string): string {
  return value.trim().toLocaleLowerCase("tr-TR");
}

function buildPricingLookup(
  clients: Client[],
  pricingRows: ClientPricing[],
): PricingLookup {
  const clientById = new Map(clients.map((c) => [c.id, c]));
  const lookup: PricingLookup = new Map();

  for (const pricing of pricingRows) {
    const client = clientById.get(pricing.client_id);
    if (!client) continue;
    lookup.set(normalizeKey(client.name), pricing);
    for (const alias of client.aliases ?? []) {
      lookup.set(normalizeKey(alias), pricing);
    }
  }

  return lookup;
}

function resolvePricing(
  block: AssignmentBlock,
  bookings: BookingWithClient[],
  clients: Client[],
  lookup: PricingLookup,
): ClientPricing | null {
  const blockBookings = bookings.filter(
    (b) => b.date >= block.start && b.date <= block.end,
  );

  for (const booking of blockBookings) {
    if (booking.client_id) {
      const pricing = lookup.get(
        normalizeKey(
          booking.client?.name ??
            clients.find((c) => c.id === booking.client_id)?.name ??
            "",
        ),
      );
      if (pricing) return pricing;
    }
  }

  for (const booking of blockBookings) {
    if (booking.client) {
      const pricing = lookup.get(normalizeKey(booking.client.name));
      if (pricing) return pricing;
    }
    const parsed = parseClientFromTitle(booking.raw_title ?? "");
    if (parsed) {
      const pricing = lookup.get(normalizeKey(parsed));
      if (pricing) return pricing;
    }
    const matched = matchClient(booking.raw_title ?? "", clients);
    if (matched) {
      const pricing = lookup.get(normalizeKey(matched.name));
      if (pricing) return pricing;
    }
  }

  const labelPricing = lookup.get(normalizeKey(block.label));
  if (labelPricing) return labelPricing;

  const parsedLabel = parseClientFromTitle(block.label);
  if (parsedLabel) {
    const pricing = lookup.get(normalizeKey(parsedLabel));
    if (pricing) return pricing;
  }

  for (const client of clients) {
    const nameKey = normalizeKey(client.name);
    const labelKey = normalizeKey(block.label);
    if (
      labelKey.includes(nameKey) ||
      nameKey.includes(labelKey) ||
      block.label.toLocaleLowerCase("tr-TR").includes(client.name.toLocaleLowerCase("tr-TR"))
    ) {
      const pricing = lookup.get(nameKey);
      if (pricing) return pricing;
    }
  }

  return null;
}

function emptyCell(): RevenueCell {
  return { amount: 0, days: 0, pricedDays: 0 };
}

function addCell(target: RevenueCell, amount: number, days: number, priced: boolean) {
  target.amount += amount;
  target.days += days;
  if (priced) target.pricedDays += days;
}

function monthFromDate(date: string): string {
  return date.slice(0, 7);
}

function addBreakdown(
  items: RevenueBreakdownItem[],
  label: string,
  amount: number,
) {
  if (amount <= 0) return;
  const existing = items.find((item) => item.label === label);
  if (existing) {
    existing.amount += amount;
    return;
  }
  items.push({ label, amount });
}

export function buildRevenueGrid(
  trainers: Trainer[],
  bookings: BookingWithClient[],
  clients: Client[],
  pricingRows: ClientPricing[],
  months: string[],
  mode: "peak" | "trainer",
): RevenueGrid {
  const lookup = buildPricingLookup(clients, pricingRows);
  const deliveryBookings = bookings.filter((b) => b.kind === "delivery");

  const rows: RevenueRow[] = trainers
    .map((trainer) => {
      const byMonth: Record<string, RevenueCell> = {};
      const breakdownByMonth: Record<string, RevenueBreakdownItem[]> = {};
      for (const month of months) {
        byMonth[month] = emptyCell();
        breakdownByMonth[month] = [];
      }

      const total = emptyCell();

      for (const month of months) {
        const blocks = assignmentsForTrainerMonth(
          deliveryBookings,
          trainer.id,
          month,
        ).filter((block) => block.kind === "delivery" && block.label !== "Dolu");

        for (const block of blocks) {
          const days = assignmentWorkdays(block.start, block.end);
          const pricing = resolvePricing(
            block,
            deliveryBookings.filter((b) => b.trainer_id === trainer.id),
            clients,
            lookup,
          );

          const amount =
            pricing && mode === "peak"
              ? calculatePeakRevenue(pricing, days)
              : pricing
                ? calculateTrainerFee(pricing, days)
                : 0;

          addCell(byMonth[month], amount, days, Boolean(pricing));
          addCell(total, amount, days, Boolean(pricing));
          addBreakdown(breakdownByMonth[month], block.label, amount);
        }

        breakdownByMonth[month].sort((a, b) =>
          b.amount - a.amount || a.label.localeCompare(b.label, "tr-TR"),
        );
      }

      return {
        trainerId: trainer.id,
        trainerName: trainer.full_name,
        byMonth,
        breakdownByMonth,
        total,
      };
    })
    .sort((a, b) => compareTrainerNames(a.trainerName, b.trainerName));

  const columnTotals: Record<string, RevenueCell> = {};
  for (const month of months) {
    columnTotals[month] = emptyCell();
    for (const row of rows) {
      const cell = row.byMonth[month];
      columnTotals[month].amount += cell.amount;
      columnTotals[month].days += cell.days;
      columnTotals[month].pricedDays += cell.pricedDays;
    }
  }

  const grandTotal = emptyCell();
  for (const row of rows) {
    grandTotal.amount += row.total.amount;
    grandTotal.days += row.total.days;
    grandTotal.pricedDays += row.total.pricedDays;
  }

  return { months, rows, columnTotals, grandTotal };
}

export function discoverClientLabels(bookings: BookingWithClient[]): string[] {
  const labels = new Set<string>();
  for (const booking of bookings) {
    if (booking.kind !== "delivery") continue;
    const label = calendarDayLabel(
      booking.kind,
      booking.raw_title,
      booking.client?.name,
    );
    if (!label || /^dolu$/i.test(label)) continue;
    labels.add(label);
  }
  return Array.from(labels).sort((a, b) => a.localeCompare(b, "tr-TR"));
}

export function trainersByClientLabel(
  bookings: BookingWithClient[],
): Record<string, string> {
  const map = new Map<string, Set<string>>();

  for (const booking of bookings) {
    if (booking.kind !== "delivery") continue;
    const label = calendarDayLabel(
      booking.kind,
      booking.raw_title,
      booking.client?.name,
    );
    if (!label || /^dolu$/i.test(label)) continue;
    const trainerName = booking.trainer?.full_name;
    if (!trainerName) continue;

    if (!map.has(label)) map.set(label, new Set());
    map.get(label)!.add(trainerName);
  }

  const result: Record<string, string> = {};
  for (const [label, names] of map) {
    result[label] = Array.from(names)
      .sort((a, b) => compareTrainerNames(a, b))
      .join(", ");
  }
  return result;
}

export function monthFromAssignment(block: AssignmentBlock): string {
  return monthFromDate(block.start);
}
