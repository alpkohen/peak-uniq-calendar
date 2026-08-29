import { readFileSync } from "fs";
import { createClient } from "@supabase/supabase-js";
import { eachDayOfInterval, format, parseISO } from "date-fns";

function loadEnv() {
  const lines = readFileSync(".env.local", "utf8").split("\n");
  const env = {};
  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const i = line.indexOf("=");
    if (i === -1) continue;
    env[line.slice(0, i).trim()] = line.slice(i + 1).trim();
  }
  return env;
}

const env = loadEnv();

const TR_HOLIDAYS = new Set([
  "2025-10-28", "2025-10-29", "2026-10-28", "2026-10-29",
]);

function isWorkday(dateStr) {
  const date = new Date(`${dateStr}T12:00:00`);
  const day = date.getDay();
  if (day === 0 || day === 6) return false;
  return !TR_HOLIDAYS.has(dateStr);
}

const MUHAMMED_EMPTY_RANGES = [
  ["2026-09-28", "2026-09-30"],
  ["2026-10-01", "2026-10-18"],
  ["2026-10-21", "2026-10-23"],
  ["2026-10-25", "2026-10-30"],
  ["2026-11-01", "2026-11-09"],
  ["2026-11-11", "2026-11-11"],
  ["2026-11-16", "2026-11-18"],
  ["2026-11-25", "2026-11-27"],
  ["2026-11-30", "2026-11-30"],
  ["2026-12-03", "2026-12-05"],
  ["2026-12-07", "2026-12-07"],
  ["2026-12-10", "2026-12-11"],
  ["2026-12-14", "2026-12-14"],
  ["2026-12-21", "2026-12-21"],
  ["2026-12-24", "2026-12-25"],
  ["2026-12-28", "2026-12-30"],
];

function buildMuhammedSchedules() {
  const emptyDays = new Set();
  for (const [start, end] of MUHAMMED_EMPTY_RANGES) {
    for (const day of eachDayOfInterval({ start: parseISO(start), end: parseISO(end) })) {
      emptyDays.add(format(day, "yyyy-MM-dd"));
    }
  }

  const filled = [];
  for (const day of eachDayOfInterval({ start: parseISO("2026-09-01"), end: parseISO("2026-12-31") })) {
    const date = format(day, "yyyy-MM-dd");
    if (!isWorkday(date) || emptyDays.has(date)) continue;
    filled.push(date);
  }

  const entries = [];
  let rangeStart = null;
  let rangeEnd = null;

  function flush() {
    if (rangeStart && rangeEnd) {
      entries.push(["Muhammed", rangeStart, rangeEnd, "dolu", "Dolu"]);
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
    const prev = parseISO(rangeEnd);
    prev.setDate(prev.getDate() + 1);
    const nextDay = format(prev, "yyyy-MM-dd");
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

const schedules = [
  ...buildMuhammedSchedules(),
  ["Taner", "2026-09-01", "2026-09-01", "dolu", "VK Performans Yönetimi Eğitimi"],
  ["Taner", "2026-09-02", "2026-09-03", "dolu", "Otokar Müşteri Deneyimi Eğitimi 1. Grup"],
  ["Taner", "2026-09-04", "2026-09-04", "dolu", "KPMG Satış Eğitimi"],
  ["Taner", "2026-09-08", "2026-09-09", "dolu", "Otokar Müşteri Deneyimi Eğitimi 2. Grup"],
  ["Taner", "2026-09-10", "2026-09-11", "dolu", "sahibinden BM 1. Eğitim"],
  ["Taner", "2026-09-14", "2026-09-16", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-09-17", "2026-09-17", "dolu", "VK SY Geçemeyenler 2026 3. Gr. 1. Görüşme"],
  ["Taner", "2026-09-18", "2026-09-18", "dolu", "Otokoç Dış Satınalma Ekipleri Role Play"],
  ["Taner", "2026-09-21", "2026-09-21", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-09-22", "2026-09-23", "dolu", "Otokar Müşteri Deneyimi Eğitimi 3. Grup"],
  ["Taner", "2026-09-24", "2026-09-27", "izin", "Assos"],
  ["Taner", "2026-10-07", "2026-10-08", "dolu", "Otokar Müşteri Deneyimi Eğitimi 4. Grup"],
  ["Taner", "2026-10-09", "2026-10-09", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-10-12", "2026-10-14", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-10-15", "2026-10-16", "dolu", "VK Performans Yönetimi Eğitimi-SY Gelişim Programı"],
  ["Taner", "2026-10-28", "2026-10-30", "tatil", "Resmî Tatil"],
  ["Taner", "2026-11-09", "2026-11-09", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-11-10", "2026-11-12", "dolu", "Metlife Koçluk Seansları"],
  ["Taner", "2026-11-17", "2026-11-17", "dolu", "Koç Üniversitesi Turquality Hizmet Grubu Eğitimi"],
  ["Taner", "2026-11-20", "2026-11-20", "dolu", "VK SY Geçemeyenler 2026 3. Gr. 2. Görüşme"],
  ["Taner", "2026-11-21", "2026-11-21", "dolu", "Koç Üniversitesi Turquality Hizmet Grubu Eğitimi"],
  ["Taner", "2026-12-14", "2026-12-17", "dolu", "Metlife Koçluk Seansları"],
  ["Ümit", "2026-09-07", "2026-09-08", "dolu", "QNB Bank Eğitimi — Ankara"],
  ["Ümit", "2026-09-10", "2026-09-11", "dolu", "QNB Bank Eğitimi — İzmir"],
  ["Ümit", "2026-09-14", "2026-09-15", "dolu", "QNB Bank Eğitimi — İstanbul"],
  ["Ümit", "2026-09-24", "2026-09-25", "dolu", "QNB Bank Eğitimi"],
  ["Ümit", "2026-10-08", "2026-10-09", "dolu", "QNB Bank Eğitimi — Bursa"],
  ["Ümit", "2026-10-12", "2026-10-13", "dolu", "QNB Bank Eğitimi — Antalya"],
  ["Ümit", "2026-10-22", "2026-10-23", "dolu", "QNB Bank Eğitimi"],
];

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.SUPABASE_SERVICE_ROLE_KEY;
const sb = createClient(url, key);

const allowed = ["Sühan", "Ümit", "Muhammed", "Taner"];

async function main() {
  const { data: trainers } = await sb.from("trainers").select("*");
  for (const t of trainers ?? []) {
    const ok = allowed.some((n) => t.full_name.startsWith(n));
    if (!ok) await sb.from("trainers").update({ active: false }).eq("id", t.id);
  }

  const trainerMap = {};
  for (const name of allowed) {
    let row = (trainers ?? []).find((t) => t.full_name.startsWith(name));
    if (!row) {
      const { data } = await sb.from("trainers").insert({
        full_name: name,
        email: `${name.toLowerCase()}@peak.com`,
        delivery_calendar_id: `delivery-${name.toLowerCase()}`,
        block_calendar_id: `block-${name.toLowerCase()}`,
        monthly_capacity_days: 20,
      }).select().single();
      row = data;
    } else {
      await sb.from("trainers").update({ full_name: name, active: true }).eq("id", row.id);
    }
    trainerMap[name] = row.id;
  }

  await sb.from("bookings").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const payload = [];
  for (const [trainer, start, end, type, title] of schedules) {
    const kind = type === "dolu" ? "delivery" : "block";
    const days = eachDayOfInterval({ start: parseISO(start), end: parseISO(end) });
    for (const day of days) {
      const date = format(day, "yyyy-MM-dd");
      if (!isWorkday(date)) continue;
      for (const slot of ["am", "pm"]) {
        payload.push({
          trainer_id: trainerMap[trainer],
          google_event_id: `manual-${trainerMap[trainer]}-${date}-${slot}`,
          date,
          slot,
          kind,
          raw_title: title,
          source: "manual",
          synced_at: new Date().toISOString(),
        });
      }
    }
  }

  const { error } = await sb.from("bookings").upsert(payload, { onConflict: "trainer_id,date,slot" });
  if (error) throw error;
  console.log(`Kaydedildi: ${payload.length} kayıt`);
}

main().catch((e) => { console.error(e); process.exit(1); });
