import { getClients, getActiveTrainers } from "./data";
import { parseImportCsv, type ParsedImportRow } from "./import";
import { createSupabaseAdmin } from "./supabase";

export async function upsertBookingRows(rows: ParsedImportRow[]) {
  const supabase = createSupabaseAdmin();
  const payload = rows.map((row) => ({
    trainer_id: row.trainerId,
    google_event_id: `manual-${row.trainerId}-${row.date}-${row.slot}`,
    google_calendar_id: null,
    date: row.date,
    slot: row.slot,
    kind: row.kind,
    client_id: row.clientId,
    raw_title: row.title,
    source: "manual" as const,
    synced_at: new Date().toISOString(),
  }));

  const { error } = await supabase
    .from("bookings")
    .upsert(payload, { onConflict: "trainer_id,date,slot" });

  if (error) throw error;
  return rows.length;
}

export async function importCsvText(csv: string) {
  const trainers = await getActiveTrainers();
  const clients = await getClients();
  const { rows, errors } = parseImportCsv(csv, trainers, clients);

  if (rows.length === 0) {
    return { imported: 0, errors, message: "İçe aktarılacak geçerli satır yok" };
  }

  const imported = await upsertBookingRows(rows);
  const uniqueLines = new Set(rows.map((row) => row.line));

  return {
    imported,
    errors,
    message: `${uniqueLines.size} satır işlendi, ${imported} kayıt kaydedildi`,
  };
}
