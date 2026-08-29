import { createSupabaseAdmin } from "./supabase";
import { formatErrorMessage } from "./errors";
import type {
  Client,
  ClientPricing,
  ClientWithPricing,
  TrainerFeeMode,
} from "./types";

export type PricingUpsertInput = {
  clientId?: string;
  name?: string;
  salePricePerDay: number;
  trainerFeeMode: TrainerFeeMode;
  trainerFeeValue: number;
};

function isMissingPricingTable(error: { message?: string; code?: string }) {
  return (
    error.message?.includes("client_pricing") || error.code === "PGRST205"
  );
}

type EmbeddedPricing = {
  sale_price_per_day: number;
  trainer_fee_mode: TrainerFeeMode;
  trainer_fee_value: number;
  updated_at: string;
};

function readEmbeddedPricing(client: Client): ClientPricing | null {
  if (!client.notes) return null;
  try {
    const data = JSON.parse(client.notes) as {
      _peak_pricing?: EmbeddedPricing;
    };
    const p = data._peak_pricing;
    if (!p) return null;
    return {
      client_id: client.id,
      sale_price_per_day: Number(p.sale_price_per_day) || 0,
      trainer_fee_mode: p.trainer_fee_mode ?? "percent",
      trainer_fee_value: Number(p.trainer_fee_value) || 0,
      updated_at: p.updated_at ?? new Date().toISOString(),
    };
  } catch {
    return null;
  }
}

function buildNotesWithPricing(
  existingNotes: string | null,
  pricing: EmbeddedPricing,
): string {
  let payload: Record<string, unknown> = {};
  if (existingNotes) {
    try {
      payload = JSON.parse(existingNotes) as Record<string, unknown>;
    } catch {
      payload = { _legacy_notes: existingNotes };
    }
  }
  payload._peak_pricing = pricing;
  return JSON.stringify(payload);
}

async function upsertEmbeddedPricing(
  clientId: string,
  input: PricingUpsertInput,
): Promise<ClientWithPricing> {
  const supabase = createSupabaseAdmin();
  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (clientError) throw new Error(formatErrorMessage(clientError));

  const embedded: EmbeddedPricing = {
    sale_price_per_day: input.salePricePerDay,
    trainer_fee_mode: input.trainerFeeMode,
    trainer_fee_value: input.trainerFeeValue,
    updated_at: new Date().toISOString(),
  };

  const { data: updated, error } = await supabase
    .from("clients")
    .update({
      notes: buildNotesWithPricing((client as Client).notes, embedded),
    })
    .eq("id", clientId)
    .select()
    .single();

  if (error) throw new Error(formatErrorMessage(error));

  return {
    ...(updated as Client),
    pricing: {
      client_id: clientId,
      ...embedded,
    },
  };
}

export async function getClientsWithPricing(): Promise<ClientWithPricing[]> {
  const supabase = createSupabaseAdmin();
  const { data: clients, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .order("name");

  if (clientError) throw clientError;

  const { data: pricingRows, error: pricingError } = await supabase
    .from("client_pricing")
    .select("*");

  if (pricingError && !isMissingPricingTable(pricingError)) {
    throw pricingError;
  }

  const pricingByClient = new Map(
    (pricingRows ?? []).map((row) => [row.client_id, row as ClientPricing]),
  );

  return ((clients ?? []) as Client[]).map((client) => ({
    ...client,
    pricing:
      pricingByClient.get(client.id) ?? readEmbeddedPricing(client),
  }));
}

export async function getAllClientPricing(): Promise<ClientPricing[]> {
  const clients = await getClientsWithPricing();
  return clients
    .map((c) => c.pricing)
    .filter((p): p is ClientPricing => p !== null);
}

export async function upsertClientPricing(
  input: PricingUpsertInput,
): Promise<ClientWithPricing> {
  const supabase = createSupabaseAdmin();
  let clientId = input.clientId;

  if (!clientId) {
    const name = input.name?.trim();
    if (!name) throw new Error("Müşteri adı gerekli");

    const existing = await supabase
      .from("clients")
      .select("*")
      .ilike("name", name)
      .maybeSingle();

    if (existing.data) {
      clientId = existing.data.id;
    } else {
      const { data, error } = await supabase
        .from("clients")
        .insert({ name, status: "active", aliases: [] })
        .select()
        .single();
      if (error) throw new Error(formatErrorMessage(error));
      clientId = data.id;
    }
  }

  const { data: pricing, error: pricingError } = await supabase
    .from("client_pricing")
    .upsert(
      {
        client_id: clientId,
        sale_price_per_day: input.salePricePerDay,
        trainer_fee_mode: input.trainerFeeMode,
        trainer_fee_value: input.trainerFeeValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "client_id" },
    )
    .select()
    .single();

  if (pricingError) {
    if (isMissingPricingTable(pricingError)) {
      if (!clientId) throw new Error("Müşteri bulunamadı");
      return upsertEmbeddedPricing(clientId, input);
    }
    throw new Error(formatErrorMessage(pricingError));
  }

  const { data: client, error: clientError } = await supabase
    .from("clients")
    .select("*")
    .eq("id", clientId)
    .single();

  if (clientError) throw clientError;

  return {
    ...(client as Client),
    pricing: pricing as ClientPricing,
  };
}

export function formatTry(amount: number): string {
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency: "TRY",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function trainerFeeLabel(
  mode: TrainerFeeMode,
  value: number,
): string {
  if (mode === "percent") return `%${value}`;
  return formatTry(value);
}

export function calculateTrainerFee(
  pricing: Pick<
    ClientPricing,
    "sale_price_per_day" | "trainer_fee_mode" | "trainer_fee_value"
  >,
  days: number,
): number {
  if (days <= 0) return 0;
  if (pricing.trainer_fee_mode === "percent") {
    return (
      days *
      pricing.sale_price_per_day *
      (pricing.trainer_fee_value / 100)
    );
  }
  return days * pricing.trainer_fee_value;
}

export function calculatePeakRevenue(
  pricing: Pick<ClientPricing, "sale_price_per_day">,
  days: number,
): number {
  return days * pricing.sale_price_per_day;
}
