import { matchClient } from "./capacity";
import type { Client, Slot, Trainer } from "./types";

export type ImportRow = {
  line: number;
  trainerName: string;
  date: string;
  slot: Slot | "full";
  kind: "delivery" | "block";
  title: string;
};

export type ParsedImportRow = ImportRow & {
  trainerId: string;
  clientId: string | null;
  slots: Slot[];
};

export type ImportParseError = {
  line: number;
  message: string;
  raw?: string;
};

const HEADER_ALIASES: Record<string, string> = {
  egitmen: "trainer",
  eğitmen: "trainer",
  trainer: "trainer",
  tarih: "date",
  date: "date",
  slot: "slot",
  donem: "slot",
  dönem: "slot",
  zaman: "slot",
  tur: "kind",
  tür: "kind",
  kind: "kind",
  baslik: "title",
  başlık: "title",
  title: "title",
  aciklama: "title",
  açıklama: "title",
};

function normalizeHeader(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseDate(value: string): string | null {
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;

  const dotMatch = trimmed.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotMatch) {
    const [, d, m, y] = dotMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  const slashMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (slashMatch) {
    const [, d, m, y] = slashMatch;
    return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
  }

  return null;
}

function parseSlot(value: string): Slot | "full" | null {
  const normalized = value.trim().toLocaleLowerCase("tr-TR");
  if (["am", "öö", "sabah"].includes(normalized)) return "am";
  if (["pm", "ös", "ogleden sonra", "öğleden sonra"].includes(normalized)) {
    return "pm";
  }
  if (["tam", "full", "tüm gün", "tum gun", "gün", "gun"].includes(normalized)) {
    return "full";
  }
  return null;
}

function parseKind(value: string): "delivery" | "block" | null {
  const normalized = value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");

  if (
    ["delivery", "teslimat", "egitim", "danismanlik", "dolu"].includes(
      normalized,
    )
  ) {
    return "delivery";
  }
  if (["block", "blok", "izin", "kapali", "kapalı", "mesgul", "meşgul"].includes(normalized)) {
    return "block";
  }
  return null;
}

function normalizeName(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function matchTrainerByName(
  name: string,
  trainers: Trainer[],
): Trainer | null {
  const normalized = normalizeName(name);
  if (!normalized) return null;

  const exact = trainers.find(
    (trainer) => normalizeName(trainer.full_name) === normalized,
  );
  if (exact) return exact;

  const contains = trainers.find((trainer) => {
    const trainerNorm = normalizeName(trainer.full_name);
    return (
      trainerNorm.includes(normalized) || normalized.includes(trainerNorm)
    );
  });
  if (contains) return contains;

  const firstWord = normalized.split(/\s+/)[0];
  return (
    trainers.find((trainer) =>
      normalizeName(trainer.full_name).startsWith(firstWord),
    ) ?? null
  );
}

export function parseImportCsv(
  text: string,
  trainers: Trainer[],
  clients: Client[],
): { rows: ParsedImportRow[]; errors: ImportParseError[] } {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  const errors: ImportParseError[] = [];
  const rows: ParsedImportRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, message: "Dosya boş" }] };
  }

  const headerCells = parseCsvLine(lines[0]).map(normalizeHeader);
  const headerMap = headerCells.map(
    (cell) => HEADER_ALIASES[cell] ?? cell,
  );

  const required = ["trainer", "date", "slot", "kind", "title"];
  for (const field of required) {
    if (!headerMap.includes(field)) {
      errors.push({
        line: 1,
        message: `Eksik sütun: ${field}. Beklenen: egitmen,tarih,donem,tur,baslik`,
      });
      return { rows, errors };
    }
  }

  const indexes = Object.fromEntries(
    required.map((field) => [field, headerMap.indexOf(field)]),
  ) as Record<(typeof required)[number], number>;

  for (let i = 1; i < lines.length; i++) {
    const lineNo = i + 1;
    const raw = lines[i];
    const cells = parseCsvLine(raw);

    const trainerName = cells[indexes.trainer] ?? "";
    const dateRaw = cells[indexes.date] ?? "";
    const slotRaw = cells[indexes.slot] ?? "";
    const kindRaw = cells[indexes.kind] ?? "";
    const title = cells[indexes.title] ?? "";

    const trainer = matchTrainerByName(trainerName, trainers);
    if (!trainer) {
      errors.push({
        line: lineNo,
        message: `Eğitmen bulunamadı: "${trainerName}"`,
        raw,
      });
      continue;
    }

    const date = parseDate(dateRaw);
    if (!date) {
      errors.push({
        line: lineNo,
        message: `Geçersiz tarih: "${dateRaw}" (YYYY-MM-DD veya GG.AA.YYYY)`,
        raw,
      });
      continue;
    }

    const slot = parseSlot(slotRaw);
    if (!slot) {
      errors.push({
        line: lineNo,
        message: `Geçersiz dönem: "${slotRaw}" (am, pm veya tam)`,
        raw,
      });
      continue;
    }

    const kind = parseKind(kindRaw);
    if (!kind) {
      errors.push({
        line: lineNo,
        message: `Geçersiz tür: "${kindRaw}" (teslimat veya blok)`,
        raw,
      });
      continue;
    }

    if (!title.trim()) {
      errors.push({
        line: lineNo,
        message: "Başlık boş olamaz",
        raw,
      });
      continue;
    }

    const slots: Slot[] = slot === "full" ? ["am", "pm"] : [slot];
    const client = kind === "delivery" ? matchClient(title, clients) : null;

    for (const slotValue of slots) {
      rows.push({
        line: lineNo,
        trainerName: trainer.full_name,
        trainerId: trainer.id,
        date,
        slot: slotValue,
        kind,
        title: title.trim(),
        clientId: client?.id ?? null,
        slots,
      });
    }
  }

  return { rows, errors };
}

export const IMPORT_TEMPLATE = `egitmen,tarih,donem,tur,baslik
`;
