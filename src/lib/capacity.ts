import {
  eachDayOfInterval,
  endOfMonth,
  format,
  parseISO,
} from "date-fns";
import type { Booking, CapacitySummary, Client, Trainer } from "./types";
import { bookingsInMonth } from "./slots";
import { isWorkday } from "./holidays";

export const MAX_MONTHLY_DELIVERY_DAYS = 20;

export const CAPACITY_LEGEND_BANDS = [
  { color: "bg-slate-100", label: "Boş", range: "0 gün (%0)" },
  { color: "bg-green-200", label: "1–4 gün", range: "%5–%20" },
  { color: "bg-emerald-300", label: "5–9 gün", range: "%25–%45" },
  { color: "bg-yellow-300", label: "10–14 gün", range: "%50–%70" },
  { color: "bg-orange-400 text-white", label: "15–19 gün", range: "%75–%95" },
  { color: "bg-red-500 text-white", label: "20 gün", range: "%100" },
] as const;

export function workdaysInMonth(month: string): number {
  const start = parseISO(`${month}-01`);
  const end = endOfMonth(start);
  return eachDayOfInterval({ start, end }).filter((day) =>
    isWorkday(format(day, "yyyy-MM-dd")),
  ).length;
}

export function calculateCapacity(
  trainer: Trainer,
  bookings: Booking[],
  month: string,
): CapacitySummary {
  const monthBookings = bookingsInMonth(bookings, month);
  const workdays = workdaysInMonth(month);
  const totalSlots = workdays * 2;
  const blockSlot = monthBookings.filter((b) => b.kind === "block").length;
  const filledSlot = monthBookings.filter((b) => b.kind === "delivery").length;
  const netCapacity = Math.max(totalSlots - blockSlot, 0);
  const remainingSlot = netCapacity - filledSlot;
  const deliveryDays = new Set(
    monthBookings.filter((b) => b.kind === "delivery").map((b) => b.date),
  ).size;

  const occupancy = occupancyFromDeliveryDays(deliveryDays);
  const targetSlots = MAX_MONTHLY_DELIVERY_DAYS * 2;
  const targetOccupancy =
    targetSlots > 0 ? filledSlot / targetSlots : 0;

  return {
    trainerId: trainer.id,
    trainerName: trainer.full_name,
    month,
    workdays,
    deliveryDays,
    brutSlot: totalSlots,
    blockSlot,
    netCapacity,
    filledSlot,
    occupancy,
    remainingSlot,
    targetSlots,
    targetOccupancy,
    overTarget: deliveryDays > MAX_MONTHLY_DELIVERY_DAYS,
  };
}

export function occupancyFromDeliveryDays(deliveryDays: number): number {
  return Math.min(deliveryDays / MAX_MONTHLY_DELIVERY_DAYS, 1);
}

export function occupancyColor(occupancy: number): string {
  const pct = Math.min(occupancy, 1);
  if (pct >= 1) return "bg-red-500 text-white";
  if (pct >= 0.75) return "bg-orange-400 text-white";
  if (pct >= 0.5) return "bg-yellow-300 text-slate-900";
  if (pct >= 0.25) return "bg-emerald-300 text-slate-900";
  if (pct > 0) return "bg-green-200 text-slate-900";
  return "bg-slate-100 text-slate-500";
}

export function formatOccupancy(occupancy: number): string {
  return `%${Math.min(Math.round(occupancy * 100), 100)}`;
}

export function formatDeliveryCapacity(deliveryDays: number): string {
  return `${deliveryDays}/${MAX_MONTHLY_DELIVERY_DAYS} gün`;
}

export function remainingDeliveryDays(deliveryDays: number): number {
  return Math.max(MAX_MONTHLY_DELIVERY_DAYS - deliveryDays, 0);
}

export function parseClientFromTitle(title: string): string | null {
  const parts = title.split("|");
  if (parts.length < 2) return null;
  const candidate = parts[0].trim();
  return candidate.length > 0 ? candidate : null;
}

export function matchClient(
  title: string,
  clients: Client[],
): Client | null {
  const parsed = parseClientFromTitle(title);
  if (!parsed) return null;

  const normalized = parsed.toLocaleLowerCase("tr-TR");

  for (const client of clients) {
    if (client.name.toLocaleLowerCase("tr-TR").includes(normalized)) {
      return client;
    }
    if (normalized.includes(client.name.toLocaleLowerCase("tr-TR"))) {
      return client;
    }
    for (const alias of client.aliases ?? []) {
      const aliasNorm = alias.toLocaleLowerCase("tr-TR");
      if (
        aliasNorm.includes(normalized) ||
        normalized.includes(aliasNorm)
      ) {
        return client;
      }
    }
  }

  return null;
}

export function clientColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue} 65% 88%)`;
}

export function calendarDayLabel(
  kind: "delivery" | "block",
  rawTitle: string | null,
  clientName?: string | null,
): string {
  if (kind === "block") {
    const title = rawTitle?.trim();
    if (!title) return "Blok";
    if (/tatil/i.test(title)) return "Tatil";
    return title;
  }

  if (clientName) return clientName;

  const parsed = parseClientFromTitle(rawTitle ?? "");
  if (parsed) return parsed;

  const title = rawTitle?.trim() ?? "";
  if (!title || /^program$/i.test(title)) return "Dolu";

  const firstToken = title.split(/[\s|—–-]/)[0]?.trim();
  if (firstToken && firstToken.length <= 24) return firstToken;

  return title.length > 24 ? `${title.slice(0, 22)}…` : title;
}

export function bookingLabel(
  kind: "delivery" | "block",
  rawTitle: string | null,
  clientName?: string | null,
): string {
  return calendarDayLabel(kind, rawTitle, clientName);
}
