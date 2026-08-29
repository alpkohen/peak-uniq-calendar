export const ALLOWED_TRAINER_NAMES = ["Sühan", "Ümit", "Muhammed", "Taner"] as const;

export function trainerSortIndex(name: string): number {
  const normalized = name.toLocaleLowerCase("tr-TR");
  const idx = ALLOWED_TRAINER_NAMES.findIndex((trainer) =>
    normalized.startsWith(trainer.toLocaleLowerCase("tr-TR")),
  );
  return idx === -1 ? ALLOWED_TRAINER_NAMES.length : idx;
}

export function compareTrainerNames(a: string, b: string): number {
  const byPriority = trainerSortIndex(a) - trainerSortIndex(b);
  if (byPriority !== 0) return byPriority;
  return a.localeCompare(b, "tr-TR");
}

export function sortTrainers<T extends { full_name: string }>(trainers: T[]): T[] {
  return [...trainers].sort((a, b) =>
    compareTrainerNames(a.full_name, b.full_name),
  );
}

export const DEFAULT_TRAINERS = [
  {
    full_name: "Sühan",
    email: "suhan@peak.com",
    delivery_calendar_id: "delivery-suhan",
    block_calendar_id: "block-suhan",
    monthly_capacity_days: 20,
  },
  {
    full_name: "Ümit",
    email: "umit@peak.com",
    delivery_calendar_id: "delivery-umit",
    block_calendar_id: "block-umit",
    monthly_capacity_days: 20,
  },
  {
    full_name: "Muhammed",
    email: "muhammed@peak.com",
    delivery_calendar_id: "delivery-muhammed",
    block_calendar_id: "block-muhammed",
    monthly_capacity_days: 20,
  },
  {
    full_name: "Taner",
    email: "taner@peak.com",
    delivery_calendar_id: "delivery-taner",
    block_calendar_id: "block-taner",
    monthly_capacity_days: 20,
  },
] as const;

export type DefaultTrainer = (typeof DEFAULT_TRAINERS)[number];
