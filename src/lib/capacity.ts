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
  return deliveryDays / MAX_MONTHLY_DELIVERY_DAYS;
}

export function occupancyColor(occupancy: number, overTarget = false): string {
  if (overTarget) return "bg-red-600 text-white";
  const pct = Math.min(occupancy, 1);
  if (pct >= 1) return "bg-red-500 text-white";
  if (pct >= 0.75) return "bg-orange-400 text-white";
  if (pct >= 0.5) return "bg-yellow-300 text-slate-900";
  if (pct >= 0.25) return "bg-emerald-300 text-slate-900";
  if (pct > 0) return "bg-green-200 text-slate-900";
  return "bg-slate-100 text-slate-500";
}

export function formatOccupancy(occupancy: number): string {
  return `%${Math.round(occupancy * 100)}`;
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

const CLIENT_COLOR_PALETTE = [
  { bg: "#93c5fd", border: "#2563eb" },
  { bg: "#fda4af", border: "#e11d48" },
  { bg: "#6ee7b7", border: "#059669" },
  { bg: "#fcd34d", border: "#d97706" },
  { bg: "#c4b5fd", border: "#7c3aed" },
  { bg: "#67e8f9", border: "#0891b2" },
  { bg: "#fdba74", border: "#ea580c" },
  { bg: "#f9a8d4", border: "#db2777" },
  { bg: "#bef264", border: "#65a30d" },
  { bg: "#a5b4fc", border: "#4f46e5" },
  { bg: "#5eead4", border: "#0d9488" },
  { bg: "#e879f9", border: "#c026d3" },
  { bg: "#7dd3fc", border: "#0284c7" },
  { bg: "#f87171", border: "#dc2626" },
  { bg: "#86efac", border: "#16a34a" },
  { bg: "#d8b4fe", border: "#9333ea" },
  { bg: "#fbbf24", border: "#b45309" },
  { bg: "#fb7185", border: "#be123c" },
  { bg: "#34d399", border: "#047857" },
  { bg: "#38bdf8", border: "#0369a1" },
] as const;

function hashClientName(name: string): number {
  const normalized = name.trim().toLocaleLowerCase("tr-TR");
  let hash = 0;
  for (let i = 0; i < normalized.length; i++) {
    hash = normalized.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash);
}

function clientPaletteEntry(name: string) {
  return CLIENT_COLOR_PALETTE[hashClientName(name) % CLIENT_COLOR_PALETTE.length];
}

export function clientColor(name: string): string {
  return clientPaletteEntry(name).bg;
}

export function clientBorderColor(name: string): string {
  return clientPaletteEntry(name).border;
}

/** Eğitmen satırları için açık arka plan rengi */
export function trainerRowColor(name: string): string {
  return clientPaletteEntry(name).bg;
}

export function trainerRowBorderColor(name: string): string {
  return clientPaletteEntry(name).border;
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
