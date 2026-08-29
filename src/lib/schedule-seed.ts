import { eachDayOfInterval, format, parseISO } from "date-fns";
import { isWorkday } from "./holidays";

type ScheduleType = "dolu" | "izin" | "tatil";

type ScheduleEntry = {
  trainer: string;
  start: string;
  end: string;
  type: ScheduleType;
  title: string;
};

export const BUILTIN_SCHEDULES: ScheduleEntry[] = [
  // Muhammed (2026): listed days are empty; remaining workdays are full
  { trainer: "Muhammed", start: "2026-09-01", end: "2026-09-25", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-10-19", end: "2026-10-20", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-11-10", end: "2026-11-10", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-11-12", end: "2026-11-13", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-11-19", end: "2026-11-24", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-12-01", end: "2026-12-02", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-12-08", end: "2026-12-09", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-12-15", end: "2026-12-18", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-12-22", end: "2026-12-23", type: "dolu", title: "Dolu" },
  { trainer: "Muhammed", start: "2026-12-31", end: "2026-12-31", type: "dolu", title: "Dolu" },

  // Taner (2026)
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
