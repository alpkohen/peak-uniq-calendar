import { createSupabaseAdmin } from "./supabase";
import { ALLOWED_TRAINER_NAMES, DEFAULT_TRAINERS, sortTrainers } from "./trainer-names";
import type { Trainer } from "./types";

export { ALLOWED_TRAINER_NAMES, DEFAULT_TRAINERS } from "./trainer-names";
export type { DefaultTrainer } from "./trainer-names";

export async function ensureDefaultTrainers(): Promise<{
  created: number;
  updated: number;
  trainers: Trainer[];
}> {
  const supabase = createSupabaseAdmin();
  let created = 0;
  let updated = 0;

  const { data: existing, error } = await supabase.from("trainers").select("*");
  if (error) throw error;

  const trainers = [...(existing ?? [])] as Trainer[];

  for (const defaults of DEFAULT_TRAINERS) {
    const match =
      trainers.find(
        (trainer) => trainer.delivery_calendar_id === defaults.delivery_calendar_id,
      ) ??
      trainers.find((trainer) =>
        trainer.full_name
          .toLocaleLowerCase("tr-TR")
          .startsWith(defaults.full_name.toLocaleLowerCase("tr-TR")),
      );

    if (match) {
      const { error: updateError } = await supabase
        .from("trainers")
        .update({
          full_name: defaults.full_name,
          email: defaults.email,
          delivery_calendar_id: defaults.delivery_calendar_id,
          block_calendar_id: defaults.block_calendar_id,
          monthly_capacity_days: defaults.monthly_capacity_days,
          active: true,
        })
        .eq("id", match.id);

      if (updateError) throw updateError;
      updated += 1;
      continue;
    }

    const { error: insertError } = await supabase
      .from("trainers")
      .insert({ ...defaults });
    if (insertError) throw insertError;
    created += 1;
  }

  for (const trainer of trainers) {
    const isAllowed = ALLOWED_TRAINER_NAMES.some((name) =>
      trainer.full_name
        .toLocaleLowerCase("tr-TR")
        .startsWith(name.toLocaleLowerCase("tr-TR")),
    );

    if (!isAllowed && trainer.active) {
      const { error: deactivateError } = await supabase
        .from("trainers")
        .update({ active: false })
        .eq("id", trainer.id);

      if (deactivateError) throw deactivateError;
    }
  }

  const { data: finalTrainers, error: finalError } = await supabase
    .from("trainers")
    .select("*")
    .eq("active", true)
    .order("full_name");

  if (finalError) throw finalError;

  return {
    created,
    updated,
    trainers: sortTrainers((finalTrainers ?? []) as Trainer[]),
  };
}
