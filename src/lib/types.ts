export type Trainer = {
  id: string;
  full_name: string;
  email: string | null;
  is_internal: boolean;
  delivery_calendar_id: string | null;
  block_calendar_id: string | null;
  monthly_capacity_days: number;
  active: boolean;
  created_at: string;
};

export type Client = {
  id: string;
  name: string;
  aliases: string[] | null;
  status: "active" | "hot" | "dormant";
  notes: string | null;
};

export type TrainerFeeMode = "percent" | "fixed";

export type ClientPricing = {
  client_id: string;
  sale_price_per_day: number;
  trainer_fee_mode: TrainerFeeMode;
  trainer_fee_value: number;
  updated_at: string;
};

export type ClientWithPricing = Client & {
  pricing: ClientPricing | null;
};

export type PipelineCategory = "kesin" | "hot";

export type HotAllocation = {
  trainerId: string;
  month: string;
  days: number;
};

export type HotClient = {
  id: string;
  name: string;
  category: PipelineCategory;
  potentialDays: number;
  dailyPrice: number;
  allocations: HotAllocation[];
};

export type HotTrainerMonth = {
  trainerId: string;
  trainerName: string;
  month: string;
  days: number;
};

export type Booking = {
  id: string;
  trainer_id: string;
  google_event_id: string | null;
  google_calendar_id: string | null;
  date: string;
  slot: "am" | "pm";
  kind: "delivery" | "block";
  client_id: string | null;
  raw_title: string | null;
  source: "gcal" | "manual";
  synced_at: string;
};

export type SyncLog = {
  trainer_id: string;
  calendar_id: string;
  sync_token: string | null;
  last_synced_at: string | null;
  last_event_count: number | null;
  last_error: string | null;
};

export type Slot = "am" | "pm";

export type CapacitySummary = {
  trainerId: string;
  trainerName: string;
  month: string;
  workdays: number;
  deliveryDays: number;
  brutSlot: number;
  blockSlot: number;
  netCapacity: number;
  filledSlot: number;
  occupancy: number;
  remainingSlot: number;
  targetSlots: number;
  targetOccupancy: number;
  overTarget: boolean;
};

export type BookingWithClient = Booking & {
  client?: Client | null;
  trainer?: Trainer | null;
};

export type GoogleCalendarEvent = {
  id: string;
  summary: string;
  status?: "confirmed" | "cancelled";
  start: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
  end: {
    date?: string;
    dateTime?: string;
    timeZone?: string;
  };
};

export type UnmatchedBooking = {
  id: string;
  trainerName: string;
  date: string;
  slot: Slot;
  rawTitle: string | null;
};

export type TrainerSyncHealth = {
  trainerId: string;
  trainerName: string;
  lastSyncedAt: string | null;
  eventsLast30Days: number;
  calendarEmpty14Days: boolean;
};
