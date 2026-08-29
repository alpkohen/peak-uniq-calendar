"use client";

import { useMemo } from "react";
import type { CapacitySummary, HotTrainerMonth } from "@/lib/types";
import { MAX_MONTHLY_DELIVERY_DAYS } from "@/lib/capacity";
import { compareTrainerNames } from "@/lib/trainer-names";

type Props = {
  capacities: CapacitySummary[];
  kesinAllocations: HotTrainerMonth[];
  hotAllocations: HotTrainerMonth[];
  months: string[];
};

function sumAllocations(
  allocations: HotTrainerMonth[],
  trainers: [string, string][],
  months: string[],
): number {
  const byTrainerMonth = new Map<string, number>();
  for (const item of allocations) {
    const key = `${item.trainerId}:${item.month}`;
    byTrainerMonth.set(key, (byTrainerMonth.get(key) ?? 0) + item.days);
  }
  return months.reduce(
    (sum, month) =>
      sum +
      trainers.reduce(
        (s, [id]) => s + (byTrainerMonth.get(`${id}:${month}`) ?? 0),
        0,
      ),
    0,
  );
}

export function OverviewKpiStrip({
  capacities,
  kesinAllocations,
  hotAllocations,
  months,
}: Props) {
  const metrics = useMemo(() => {
    const trainers = Array.from(
      new Map(capacities.map((c) => [c.trainerId, c.trainerName])).entries(),
    ).sort(([, a], [, b]) => compareTrainerNames(a, b));

    const byTrainerMonth = new Map<string, number>();
    for (const c of capacities) {
      byTrainerMonth.set(`${c.trainerId}:${c.month}`, c.deliveryDays);
    }

    const soldTotal = months.reduce(
      (sum, month) =>
        sum +
        trainers.reduce(
          (s, [id]) => s + (byTrainerMonth.get(`${id}:${month}`) ?? 0),
          0,
        ),
      0,
    );

    const kesinTotal = sumAllocations(kesinAllocations, trainers, months);
    const hotTotal = sumAllocations(hotAllocations, trainers, months);

    const potentialTotal = trainers.length * MAX_MONTHLY_DELIVERY_DAYS * months.length;
    const occupancyPct =
      potentialTotal > 0 ? Math.round((soldTotal / potentialTotal) * 100) : 0;
    const capacityGap = Math.max(
      0,
      potentialTotal - soldTotal - kesinTotal - hotTotal,
    );

    return {
      occupancyPct,
      potentialTotal,
      soldTotal,
      kesinTotal,
      hotTotal,
      capacityGap,
    };
  }, [capacities, kesinAllocations, hotAllocations, months]);

  const cards = [
    { label: "Doluluk Oranı", value: `%${metrics.occupancyPct}` },
    {
      label: "Toplam Satılabilir",
      value: metrics.potentialTotal.toLocaleString("tr-TR"),
    },
    {
      label: "Satılmış",
      value: metrics.soldTotal.toLocaleString("tr-TR"),
    },
    {
      label: "Kesin",
      value: metrics.kesinTotal.toLocaleString("tr-TR"),
    },
    {
      label: "Hot",
      value: metrics.hotTotal.toLocaleString("tr-TR"),
    },
    {
      label: "Kapasite Açığı",
      value: metrics.capacityGap.toLocaleString("tr-TR"),
    },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
      {cards.map((card) => (
        <div key={card.label} className="card p-4">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
            {card.label}
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-slate-900">
            {card.value}
          </p>
        </div>
      ))}
    </div>
  );
}
