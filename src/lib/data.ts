import { createSupabaseAdmin } from "./supabase";
import { DEFAULT_TRAINERS, sortTrainers } from "./trainer-names";
import type {
  Booking,
  BookingWithClient,
  Client,
  SyncLog,
  Trainer,
  TrainerSyncHealth,
  UnmatchedBooking,
} from "./types";

export async function getActiveTrainers(): Promise<Trainer[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("trainers")
    .select("*")
    .eq("active", true)
    .order("full_name");

  if (error) throw error;
  return sortTrainers((data ?? []) as Trainer[]);
}

export async function getClients(): Promise<Client[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("clients").select("*");
  if (error) throw error;
  return (data ?? []) as Client[];
}

export async function getBookings(): Promise<BookingWithClient[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, client:clients(*), trainer:trainers(*)")
    .order("date");

  if (error) throw error;
  return (data ?? []) as BookingWithClient[];
}

export async function getSyncLogs(): Promise<SyncLog[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase.from("sync_log").select("*");
  if (error) throw error;
  return (data ?? []) as SyncLog[];
}

export async function getUnmatchedBookings(): Promise<UnmatchedBooking[]> {
  const bookings = await getBookings();
  return bookings
    .filter((b) => b.kind === "delivery" && !b.client_id && b.raw_title)
    .map((b) => ({
      id: b.id,
      trainerName: b.trainer?.full_name ?? "Bilinmeyen",
      date: b.date,
      slot: b.slot,
      rawTitle: b.raw_title,
    }));
}

export async function getTrainerSyncHealth(): Promise<TrainerSyncHealth[]> {
  const trainers = await getActiveTrainers();
  const logs = await getSyncLogs();
  const bookings = await getBookings();

  const now = new Date();
  const thirtyDaysAgo = new Date(now);
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const fourteenDaysAgo = new Date(now);
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14);

  const thirtyDaysAgoStr = thirtyDaysAgo.toISOString().slice(0, 10);
  const fourteenDaysAgoStr = fourteenDaysAgo.toISOString().slice(0, 10);

  return trainers.map((trainer) => {
    const trainerLogs = logs.filter((l) => l.trainer_id === trainer.id);
    const lastSyncedAt = trainerLogs
      .map((l) => l.last_synced_at)
      .filter(Boolean)
      .sort()
      .pop() ?? null;

    const trainerBookings = bookings.filter((b) => b.trainer_id === trainer.id);
    const eventsLast30Days = trainerBookings.filter(
      (b) => b.date >= thirtyDaysAgoStr,
    ).length;

    const recentBookings = trainerBookings.filter(
      (b) => b.date >= fourteenDaysAgoStr,
    );

    return {
      trainerId: trainer.id,
      trainerName: trainer.full_name,
      lastSyncedAt,
      eventsLast30Days,
      calendarEmpty14Days: recentBookings.length === 0,
    };
  });
}

export async function seedIfEmpty(): Promise<{ seeded: boolean; message: string }> {
  const supabase = createSupabaseAdmin();

  const { count } = await supabase
    .from("trainers")
    .select("*", { count: "exact", head: true });

  if ((count ?? 0) > 0) {
    return { seeded: false, message: "Veri zaten mevcut" };
  }

  const trainers = DEFAULT_TRAINERS.map((trainer) => ({ ...trainer }));

  const clients = [
    {
      name: "Vakıf Katılım",
      aliases: ["Vakif Katilim"],
      status: "active",
    },
    {
      name: "ABC Bank",
      aliases: ["ABC"],
      status: "active",
    },
    {
      name: "XYZ Holding",
      aliases: [],
      status: "hot",
    },
    {
      name: "Mega Corp",
      aliases: ["Mega"],
      status: "active",
    },
  ];

  const { error: trainerError } = await supabase.from("trainers").insert(trainers);
  if (trainerError) throw trainerError;

  const { error: clientError } = await supabase.from("clients").insert(clients);
  if (clientError) throw clientError;

  return { seeded: true, message: "Örnek eğitmen ve müşteri verisi eklendi" };
}
