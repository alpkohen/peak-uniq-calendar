import { matchClient } from "./capacity";
import { fetchCalendarEvents } from "./google-calendar";
import { extractSlotsFromEvent } from "./slots";
import { createSupabaseAdmin } from "./supabase";
import { sortTrainers } from "./trainer-names";
import type { Client, Trainer } from "./types";

type SyncResult = {
  trainerId: string;
  trainerName: string;
  calendarsSynced: number;
  bookingsUpserted: number;
  bookingsRemoved: number;
};

export async function syncAllTrainers(): Promise<SyncResult[]> {
  const supabase = createSupabaseAdmin();

  const { data: trainers, error: trainersError } = await supabase
    .from("trainers")
    .select("*")
    .eq("active", true)
    .order("full_name");

  if (trainersError) throw trainersError;

  const activeTrainers = sortTrainers((trainers ?? []) as Trainer[]);

  const { data: clients, error: clientsError } = await supabase
    .from("clients")
    .select("*");

  if (clientsError) throw clientsError;

  const results: SyncResult[] = [];

  for (const trainer of activeTrainers) {
    const result = await syncTrainer(
      supabase,
      trainer,
      (clients ?? []) as Client[],
    );
    results.push(result);
  }

  return results;
}

async function syncTrainer(
  supabase: ReturnType<typeof createSupabaseAdmin>,
  trainer: Trainer,
  clients: Client[],
): Promise<SyncResult> {
  let bookingsUpserted = 0;
  let bookingsRemoved = 0;
  let calendarsSynced = 0;

  const calendars: Array<{ id: string | null; kind: "delivery" | "block" }> = [
    { id: trainer.delivery_calendar_id, kind: "delivery" },
    { id: trainer.block_calendar_id, kind: "block" },
  ];

  for (const calendar of calendars) {
    if (!calendar.id) continue;

    calendarsSynced += 1;

    const events = await fetchCalendarEvents(calendar.id, trainer.full_name);
    const activeEventIds = new Set<string>();

    for (const event of events) {
      if (event.status === "cancelled") {
        const { count } = await supabase
          .from("bookings")
          .delete({ count: "exact" })
          .eq("trainer_id", trainer.id)
          .eq("google_event_id", event.id);

        bookingsRemoved += count ?? 0;
        continue;
      }

      activeEventIds.add(event.id);
      const slots = extractSlotsFromEvent(event);
      const client = matchClient(event.summary, clients);

      for (const { date, slot } of slots) {
        const { error } = await supabase.from("bookings").upsert(
          {
            trainer_id: trainer.id,
            google_event_id: event.id,
            google_calendar_id: calendar.id,
            date,
            slot,
            kind: calendar.kind,
            client_id: client?.id ?? null,
            raw_title: event.summary,
            source: "gcal",
            synced_at: new Date().toISOString(),
          },
          { onConflict: "trainer_id,date,slot" },
        );

        if (!error) bookingsUpserted += 1;
      }
    }

    await supabase.from("sync_log").upsert(
      {
        trainer_id: trainer.id,
        calendar_id: calendar.id,
        sync_token: `mock-token-${Date.now()}`,
        last_synced_at: new Date().toISOString(),
        last_event_count: events.length,
        last_error: null,
      },
      { onConflict: "trainer_id,calendar_id" },
    );
  }

  return {
    trainerId: trainer.id,
    trainerName: trainer.full_name,
    calendarsSynced,
    bookingsUpserted,
    bookingsRemoved,
  };
}
