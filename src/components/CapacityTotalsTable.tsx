"use client";

import { useMemo, useState } from "react";
import type { CapacitySummary } from "@/lib/types";
import {
  MAX_MONTHLY_DELIVERY_DAYS,
  occupancyColor,
  occupancyFromDeliveryDays,
} from "@/lib/capacity";
import { compareTrainerNames } from "@/lib/trainer-names";

type Props = {
  months: string[];
  capacities: CapacitySummary[];
};

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
}

function formatPct(sold: number, potential: number): string {
  if (potential <= 0) return "—";
  return `%${Math.round((sold / potential) * 100)}`;
}

export function CapacityTotalsTable({ months, capacities }: Props) {
  const [expanded, setExpanded] = useState(false);

  const trainers = useMemo(
    () =>
      Array.from(
        new Map(capacities.map((c) => [c.trainerId, c.trainerName])).entries(),
      ).sort(([, a], [, b]) => compareTrainerNames(a, b)),
    [capacities],
  );

  const byTrainerMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const c of capacities) {
      map.set(`${c.trainerId}:${c.month}`, c.deliveryDays);
    }
    return map;
  }, [capacities]);

  const soldByMonth = months.map((month) =>
    trainers.reduce(
      (sum, [trainerId]) =>
        sum + (byTrainerMonth.get(`${trainerId}:${month}`) ?? 0),
      0,
    ),
  );
  const soldTotal = soldByMonth.reduce((a, b) => a + b, 0);

  const trainerCount = trainers.length;
  const potentialPerMonth = trainerCount * MAX_MONTHLY_DELIVERY_DAYS;
  const potentialTotal = potentialPerMonth * months.length;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Kapasite özeti</h2>
        <p className="text-sm text-slate-500">
          Satılmış gün, potansiyel ve kullanım — ay bazında.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[260px] bg-slate-50 px-3 py-3 text-left">
                &nbsp;
              </th>
              {months.map((month) => (
                <th key={month} className="min-w-[110px] px-2 py-3 text-right">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="min-w-[110px] bg-slate-50 px-3 py-3 text-right font-bold">
                Toplam
              </th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setExpanded((v) => !v)}
                    aria-expanded={expanded}
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                  >
                    {expanded ? "−" : "+"}
                  </button>
                  Toplam satılmış gün
                </div>
              </td>
              {soldByMonth.map((days, i) => (
                <td
                  key={months[i]}
                  className="px-2 py-3 text-right tabular-nums font-semibold text-slate-900"
                >
                  {days}
                </td>
              ))}
              <td className="bg-slate-50 px-3 py-3 text-right font-bold tabular-nums text-slate-900">
                {soldTotal}
              </td>
            </tr>

            {expanded &&
              trainers.map(([trainerId, trainerName]) => {
                const days = months.map(
                  (month) => byTrainerMonth.get(`${trainerId}:${month}`) ?? 0,
                );
                const rowTotal = days.reduce((a, b) => a + b, 0);
                return (
                  <tr key={trainerId} className="bg-slate-50/80">
                    <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 pl-12 text-sm text-slate-600">
                      {trainerName}
                    </td>
                    {days.map((value, i) => (
                      <td
                        key={`${trainerId}-${months[i]}`}
                        className="px-2 py-2 text-right text-sm tabular-nums text-slate-700"
                      >
                        {value}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right text-sm font-medium tabular-nums text-slate-800">
                      {rowTotal}
                    </td>
                  </tr>
                );
              })}

            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
                Toplam potansiyel satılabilir gün
              </td>
              {months.map((month) => (
                <td
                  key={month}
                  className="px-2 py-3 text-right tabular-nums font-semibold text-slate-900"
                >
                  {potentialPerMonth}
                </td>
              ))}
              <td className="bg-slate-50 px-3 py-3 text-right font-bold tabular-nums text-slate-900">
                {potentialTotal}
              </td>
            </tr>

            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
                Kapasite kullanım %
              </td>
              {soldByMonth.map((sold, i) => {
                const occupancy = occupancyFromDeliveryDays(
                  trainerCount > 0 ? sold / trainerCount : 0,
                );
                return (
                  <td key={months[i]} className="p-1.5">
                    <div
                      className={`flex h-10 items-center justify-center rounded-md text-sm font-bold ${occupancyColor(occupancy)}`}
                    >
                      {formatPct(sold, potentialPerMonth)}
                    </div>
                  </td>
                );
              })}
              <td className="p-1.5">
                <div
                  className={`flex h-10 items-center justify-center rounded-md text-sm font-bold ${occupancyColor(
                    occupancyFromDeliveryDays(
                      trainerCount > 0 && months.length > 0
                        ? soldTotal / (trainerCount * months.length)
                        : 0,
                    ),
                  )}`}
                >
                  {formatPct(soldTotal, potentialTotal)}
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Not: Potansiyel satılabilir gün, eğitmen başına ayda{" "}
        {MAX_MONTHLY_DELIVERY_DAYS} gündür
        {trainerCount > 0
          ? ` (${trainerCount} kişi × ${MAX_MONTHLY_DELIVERY_DAYS} = ${potentialPerMonth} gün/ay)`
          : ""}
        . Kapasite kullanım % = satılmış gün ÷ potansiyel gün.
      </p>
    </section>
  );
}
