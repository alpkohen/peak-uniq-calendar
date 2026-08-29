import { addDays, eachDayOfInterval, format, parseISO } from "date-fns";
import { isWorkday } from "./holidays";

type ScheduleType = "dolu" | "izin" | "tatil";

type ScheduleEntry = {
  trainer: string;
  start: string;
  end: string;
  type: ScheduleType;
  title: string;
};

/** Muhammed: these workdays are empty; all other workdays Sep–Dec 2026 are Dolu. */
const MUHAMMED_EMPTY_RANGES: Array<{ start: string; end: string }> = [
  { start: "2026-09-28", end: "2026-09-30" },
  { start: "2026-10-01", end: "2026-10-18" },
  { start: "2026-10-21", end: "2026-10-23" },
  { start: "2026-10-25", end: "2026-10-30" },
  { start: "2026-11-01", end: "2026-11-09" },
  { start: "2026-11-11", end: "2026-11-11" },
  { start: "2026-11-16", end: "2026-11-18" },
  { start: "2026-11-25", end: "2026-11-27" },
  { start: "2026-11-30", end: "2026-11-30" },
  { start: "2026-12-03", end: "2026-12-05" },
  { start: "2026-12-07", end: "2026-12-07" },
  { start: "2026-12-10", end: "2026-12-11" },
  { start: "2026-12-14", end: "2026-12-14" },
  { start: "2026-12-21", end: "2026-12-21" },
  { start: "2026-12-24", end: "2026-12-25" },
  { start: "2026-12-28", end: "2026-12-30" },
];

function buildMuhammedSchedules(): ScheduleEntry[] {
  const emptyDays = new Set<string>();
  for (const { start, end } of MUHAMMED_EMPTY_RANGES) {
    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
    for (const day of days) {
      emptyDays.add(format(day, "yyyy-MM-dd"));
    }
  }

  const filled: string[] = [];
  const days = eachDayOfInterval({
    start: parseISO("2026-09-01"),
    end: parseISO("2026-12-31"),
  });
  for (const day of days) {
    const date = format(day, "yyyy-MM-dd");
    if (!isWorkday(date) || emptyDays.has(date)) continue;
    filled.push(date);
  }

  const entries: ScheduleEntry[] = [];
  let rangeStart: string | null = null;
  let rangeEnd: string | null = null;

  function flush() {
    if (rangeStart && rangeEnd) {
      entries.push({
        trainer: "Muhammed",
        start: rangeStart,
        end: rangeEnd,
        type: "dolu",
        title: "Dolu",
      });
    }
    rangeStart = null;
    rangeEnd = null;
  }

  for (const date of filled) {
    if (!rangeStart) {
      rangeStart = date;
      rangeEnd = date;
      continue;
    }
    const nextDay = format(addDays(parseISO(rangeEnd!), 1), "yyyy-MM-dd");
    if (date === nextDay) {
      rangeEnd = date;
    } else {
      flush();
      rangeStart = date;
      rangeEnd = date;
    }
  }
  flush();

  return entries;
}

export const BUILTIN_SCHEDULES: ScheduleEntry[] = [
  ...buildMuhammedSchedules(),
  { trainer: "Taner", start: "2026-09-01", end: "2026-09-01", type: "dolu", title: "VK Performans Yönetimi Eğitimi" },
  { trainer: "Taner", start: "2026-09-02", end: "2026-09-03", type: "dolu", title: "Otokar Müşteri Deneyimi Eğitimi 1. Grup" },
  { trainer: "Taner", start: "2026-09-04", end: "2026-09-04", type: "dolu", title: "KPMG Satış Eğitimi" },
  { trainer: "Taner", start: "2026-09-08", end: "2026-09-09", type: "dolu", title: "Otokar Müşteri Deneyimi Eğitimi 2. Grup" },
  { trainer: "Taner", start: "2026-09-10", end: "2026-09-11", type: "dolu", title: "sahibinden BM 1. Eğitim" },
  { trainer: "Taner", start: "2026-09-14", end: "2026-09-16", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-09-17", end: "2026-09-17", type: "dolu", title: "VK SY Geçemeyenler 2026 3. Gr. 1. Görüşme" },
  { trainer: "Taner", start: "2026-09-18", end: "2026-09-18", type: "dolu", title: "Otokoç Dış Satınalma Ekipleri Role Play" },
  { trainer: "Taner", start: "2026-09-21", end: "2026-09-21", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-09-22", end: "2026-09-23", type: "dolu", title: "Otokar Müşteri Deneyimi Eğitimi 3. Grup" },
  { trainer: "Taner", start: "2026-09-24", end: "2026-09-27", type: "izin", title: "Assos" },
  { trainer: "Taner", start: "2026-10-07", end: "2026-10-08", type: "dolu", title: "Otokar Müşteri Deneyimi Eğitimi 4. Grup" },
  { trainer: "Taner", start: "2026-10-09", end: "2026-10-09", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-10-12", end: "2026-10-14", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-10-15", end: "2026-10-16", type: "dolu", title: "VK Performans Yönetimi Eğitimi-SY Gelişim Programı" },
  { trainer: "Taner", start: "2026-10-28", end: "2026-10-30", type: "tatil", title: "Resmî Tatil" },
  { trainer: "Taner", start: "2026-11-09", end: "2026-11-09", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-11-10", end: "2026-11-12", type: "dolu", title: "Metlife Koçluk Seansları" },
  { trainer: "Taner", start: "2026-11-17", end: "2026-11-17", type: "dolu", title: "Koç Üniversitesi Turquality Hizmet Grubu Eğitimi" },
  { trainer: "Taner", start: "2026-11-20", end: "2026-11-20", type: "dolu", title: "VK SY Geçemeyenler 2026 3. Gr. 2. Görüşme" },
  { trainer: "Taner", start: "2026-11-21", end: "2026-11-21", type: "dolu", title: "Koç Üniversitesi Turquality Hizmet Grubu Eğitimi" },
  { trainer: "Taner", start: "2026-12-14", end: "2026-12-17", type: "dolu", title: "Metlife Koçluk Seansları" },

  // Ümit (2026)
  { trainer: "Ümit", start: "2026-09-07", end: "2026-09-08", type: "dolu", title: "QNB Bank Eğitimi — Ankara" },
  { trainer: "Ümit", start: "2026-09-10", end: "2026-09-11", type: "dolu", title: "QNB Bank Eğitimi — İzmir" },
  { trainer: "Ümit", start: "2026-09-14", end: "2026-09-15", type: "dolu", title: "QNB Bank Eğitimi — İstanbul" },
  { trainer: "Ümit", start: "2026-09-24", end: "2026-09-25", type: "dolu", title: "QNB Bank Eğitimi" },
  { trainer: "Ümit", start: "2026-10-08", end: "2026-10-09", type: "dolu", title: "QNB Bank Eğitimi — Bursa" },
  { trainer: "Ümit", start: "2026-10-12", end: "2026-10-13", type: "dolu", title: "QNB Bank Eğitimi — Antalya" },
  { trainer: "Ümit", start: "2026-10-22", end: "2026-10-23", type: "dolu", title: "QNB Bank Eğitimi" },
];

function kindForType(type: ScheduleType): "delivery" | "block" {
  return type === "dolu" ? "delivery" : "block";
}

function turLabel(type: ScheduleType): string {
  return type === "dolu" ? "teslimat" : "blok";
}

function expandEntry(entry: ScheduleEntry): string[] {
  const start = parseISO(entry.start);
  const end = parseISO(entry.end);
  const days = eachDayOfInterval({ start, end });

  const lines: string[] = [];
  for (const day of days) {
    const date = format(day, "yyyy-MM-dd");
    if (!isWorkday(date)) continue;
    lines.push(
      `${entry.trainer},${date},tam,${turLabel(entry.type)},"${entry.title.replace(/"/g, '""')}"`,
    );
  }
  return lines;
}

export function buildScheduleCsv(): string {
  const header = "egitmen,tarih,donem,tur,baslik";
  const lines = BUILTIN_SCHEDULES.flatMap(expandEntry);
  return [header, ...lines].join("\n");
}

export function scheduleSummary(): {
  trainers: Record<string, number>;
  totalLines: number;
} {
  const lines = BUILTIN_SCHEDULES.flatMap(expandEntry);
  const trainers: Record<string, number> = {};
  for (const line of lines) {
    const trainer = line.split(",")[0];
    trainers[trainer] = (trainers[trainer] ?? 0) + 1;
  }
  return { trainers, totalLines: lines.length };
}

export { kindForType };
