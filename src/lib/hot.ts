import { createSupabaseAdmin } from "./supabase";
import { formatErrorMessage } from "./errors";
import { compareTrainerNames } from "./trainer-names";
import type { Client, HotAllocation, HotClient, HotTrainerMonth, PipelineCategory, Trainer } from "./types";

export type HotUpsertInput = {
  id?: string;
  name: string;
  category: PipelineCategory;
  potentialDays: number;
  dailyPrice: number;
  allocations: HotAllocation[];
};

function isMissingHotTable(error: { message?: string; code?: string }) {
  return (
    error.message?.includes("hot_clients") ||
    error.message?.includes("hot_allocations") ||
    error.code === "PGRST205"
  );
}

type EmbeddedHot = {
  category?: PipelineCategory;
  potential_days: number;
  daily_price: number;
  allocations: {
    trainer_id: string;
    month: string;
    days: number;
  }[];
};

function readEmbeddedHot(client: Client): EmbeddedHot | null {
  if (!client.notes) return null;
  try {
    const data = JSON.parse(client.notes) as { _peak_hot?: EmbeddedHot };
    return data._peak_hot ?? null;
  } catch {
    return null;
  }
}

function writeEmbeddedHot(
  existingNotes: string | null,
  hot: EmbeddedHot,
): string {
  let payload: Record<string, unknown> = {};
  if (existingNotes) {
    try {
      payload = JSON.parse(existingNotes) as Record<string, unknown>;
    } catch {
      payload = { _legacy_notes: existingNotes };
    }
  }
  payload._peak_hot = hot;
  return JSON.stringify(payload);
}

function normalizeAllocations(items: HotAllocation[]): HotAllocation[] {
  const merged = new Map<string, HotAllocation>();
  for (const item of items) {
    const days = Number(item.days) || 0;
    if (days <= 0) continue;
    const key = `${item.trainerId}:${item.month}`;
    const existing = merged.get(key);
    if (existing) existing.days += days;
    else
      merged.set(key, {
        trainerId: item.trainerId,
        month: item.month,
        days,
      });
  }
  return Array.from(merged.values());
}

function fromTableRow(
  row: {
    id: string;
    name: string;
    category?: string;
    potential_days: number | string;
    daily_price: number | string;
  },
  allocations: HotAllocation[],
): HotClient {
  return {
    id: row.id,
    name: row.name,
    category: row.category === "kesin" ? "kesin" : "hot",
    potentialDays: Number(row.potential_days) || 0,
    dailyPrice: Number(row.daily_price) || 0,
    allocations,
  };
}

async function listFromTables(): Promise<HotClient[] | "missing"> {
  const supabase = createSupabaseAdmin();
  const { data: clients, error: clientError } = await supabase
    .from("hot_clients")
    .select("*")
    .order("name");

  if (clientError) {
    if (isMissingHotTable(clientError)) return "missing";
    throw new Error(formatErrorMessage(clientError));
  }

  const { data: allocationRows, error: allocError } = await supabase
    .from("hot_allocations")
    .select("*");

  if (allocError) {
    if (isMissingHotTable(allocError)) return "missing";
    throw new Error(formatErrorMessage(allocError));
  }

  const byClient = new Map<string, HotAllocation[]>();
  for (const row of allocationRows ?? []) {
    const list = byClient.get(row.hot_client_id) ?? [];
    list.push({
      trainerId: row.trainer_id,
      month: row.month,
      days: Number(row.days) || 0,
    });
    byClient.set(row.hot_client_id, list);
  }

  return ((clients ?? []) as Array<{
    id: string;
    name: string;
    potential_days: number;
    daily_price: number;
  }>).map((row) =>
    fromTableRow(row, normalizeAllocations(byClient.get(row.id) ?? [])),
  );
}

async function listFromClientsFallback(): Promise<HotClient[]> {
  const supabase = createSupabaseAdmin();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .eq("status", "hot")
    .order("name");

  if (error) throw new Error(formatErrorMessage(error));

  return ((data ?? []) as Client[]).map((client) => {
    const embedded = readEmbeddedHot(client);
    return {
      id: client.id,
      name: client.name,
      category: embedded?.category === "kesin" ? "kesin" : "hot",
      potentialDays: embedded?.potential_days ?? 0,
      dailyPrice: embedded?.daily_price ?? 0,
      allocations: normalizeAllocations(
        (embedded?.allocations ?? []).map((item) => ({
          trainerId: item.trainer_id,
          month: item.month,
          days: item.days,
        })),
      ),
    };
  });
}

export async function getHotClients(): Promise<HotClient[]> {
  const fromTables = await listFromTables();
  if (fromTables === "missing") return listFromClientsFallback();
  return fromTables;
}

async function replaceTableAllocations(
  hotClientId: string,
  allocations: HotAllocation[],
) {
  const supabase = createSupabaseAdmin();
  const { error: deleteError } = await supabase
    .from("hot_allocations")
    .delete()
    .eq("hot_client_id", hotClientId);

  if (deleteError) throw new Error(formatErrorMessage(deleteError));

  const rows = normalizeAllocations(allocations).map((item) => ({
    hot_client_id: hotClientId,
    trainer_id: item.trainerId,
    month: item.month,
    days: item.days,
  }));

  if (rows.length === 0) return;

  const { error: insertError } = await supabase
    .from("hot_allocations")
    .insert(rows);

  if (insertError) throw new Error(formatErrorMessage(insertError));
}

async function upsertViaTables(input: HotUpsertInput): Promise<HotClient | "missing"> {
  const supabase = createSupabaseAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Müşteri adı gerekli");

  const payload = {
    name,
    category: input.category,
    potential_days: input.potentialDays,
    daily_price: input.dailyPrice,
    updated_at: new Date().toISOString(),
  };

  let id = input.id;
  if (id) {
    const { data, error } = await supabase
      .from("hot_clients")
      .update(payload)
      .eq("id", id)
      .select()
      .single();
    if (error) {
      if (isMissingHotTable(error)) return "missing";
      throw new Error(formatErrorMessage(error));
    }
    id = data.id;
  } else {
    const { data, error } = await supabase
      .from("hot_clients")
      .insert(payload)
      .select()
      .single();
    if (error) {
      if (isMissingHotTable(error)) return "missing";
      throw new Error(formatErrorMessage(error));
    }
    id = data.id;
  }

  if (!id) throw new Error("Hot müşteri kaydedilemedi");

  try {
    await replaceTableAllocations(id, input.allocations);
  } catch (error) {
    if (
      error instanceof Error &&
      (error.message.includes("hot_allocations") || error.message.includes("PGRST205"))
    ) {
      return "missing";
    }
    throw error;
  }

  return {
    id,
    name,
    category: input.category,
    potentialDays: input.potentialDays,
    dailyPrice: input.dailyPrice,
    allocations: normalizeAllocations(input.allocations),
  };
}

async function upsertViaClientsFallback(input: HotUpsertInput): Promise<HotClient> {
  const supabase = createSupabaseAdmin();
  const name = input.name.trim();
  if (!name) throw new Error("Müşteri adı gerekli");

  const allocations = normalizeAllocations(input.allocations);
  const embedded: EmbeddedHot = {
    category: input.category,
    potential_days: input.potentialDays,
    daily_price: input.dailyPrice,
    allocations: allocations.map((item) => ({
      trainer_id: item.trainerId,
      month: item.month,
      days: item.days,
    })),
  };

  let clientId = input.id;
  if (!clientId) {
    const { data, error } = await supabase
      .from("clients")
      .insert({
        name,
        status: "hot",
        aliases: [],
        notes: writeEmbeddedHot(null, embedded),
      })
      .select()
      .single();
    if (error) throw new Error(formatErrorMessage(error));
    clientId = data.id;
  } else {
    const { data: existing, error: readError } = await supabase
      .from("clients")
      .select("*")
      .eq("id", clientId)
      .single();
    if (readError) throw new Error(formatErrorMessage(readError));

    const { error } = await supabase
      .from("clients")
      .update({
        name,
        status: "hot",
        notes: writeEmbeddedHot((existing as Client).notes, embedded),
      })
      .eq("id", clientId);
    if (error) throw new Error(formatErrorMessage(error));
  }

  if (!clientId) throw new Error("Hot müşteri kaydedilemedi");

  return {
    id: clientId,
    name,
    category: input.category,
    potentialDays: input.potentialDays,
    dailyPrice: input.dailyPrice,
    allocations,
  };
}

export async function upsertHotClient(input: HotUpsertInput): Promise<HotClient> {
  const viaTables = await upsertViaTables(input);
  if (viaTables === "missing") return upsertViaClientsFallback(input);
  return viaTables;
}

export async function deleteHotClient(id: string): Promise<void> {
  const supabase = createSupabaseAdmin();
  const { error } = await supabase.from("hot_clients").delete().eq("id", id);
  if (error && isMissingHotTable(error)) {
    const { error: fallbackError } = await supabase
      .from("clients")
      .delete()
      .eq("id", id)
      .eq("status", "hot");
    if (fallbackError) throw new Error(formatErrorMessage(fallbackError));
    return;
  }
  if (error) throw new Error(formatErrorMessage(error));
}

export function flattenHotAllocations(
  hotClients: HotClient[],
  trainers: Trainer[],
  category?: PipelineCategory,
): HotTrainerMonth[] {
  const nameById = new Map(trainers.map((t) => [t.id, t.full_name]));
  const merged = new Map<string, HotTrainerMonth>();

  for (const client of hotClients) {
    if (category && client.category !== category) continue;
    for (const item of client.allocations) {
      if (item.days <= 0) continue;
      const key = `${item.trainerId}:${item.month}`;
      const existing = merged.get(key);
      if (existing) {
        existing.days += item.days;
      } else {
        merged.set(key, {
          trainerId: item.trainerId,
          trainerName: nameById.get(item.trainerId) ?? "—",
          month: item.month,
          days: item.days,
        });
      }
    }
  }

  return Array.from(merged.values()).sort(
    (a, b) =>
      compareTrainerNames(a.trainerName, b.trainerName) ||
      a.month.localeCompare(b.month),
  );
}
