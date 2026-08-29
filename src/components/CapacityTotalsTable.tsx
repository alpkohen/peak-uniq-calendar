"use client";

import { useMemo, useState } from "react";
import type { CapacitySummary, HotTrainerMonth } from "@/lib/types";
import {
  MAX_MONTHLY_DELIVERY_DAYS,
  occupancyColor,
} from "@/lib/capacity";
import { compareTrainerNames } from "@/lib/trainer-names";

type Props = {
  months: string[];
  capacities: CapacitySummary[];
  kesinAllocations: HotTrainerMonth[];
  hotAllocations: HotTrainerMonth[];
};

function buildTrainerMonthMap(allocations: HotTrainerMonth[]) {
  const map = new Map<string, number>();
  for (const item of allocations) {
    const key = `${item.trainerId}:${item.month}`;
    map.set(key, (map.get(key) ?? 0) + item.days);
  }
  return map;
}

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
}

function formatPct(sold: number, potential: number): string {
  if (potential <= 0) return "—";
  return `%${Math.round((sold / potential) * 100)}`;
}

export function CapacityTotalsTable({
  months,
  capacities,
  kesinAllocations,
  hotAllocations,
}: Props) {
  const [soldOpen, setSoldOpen] = useState(false);
  const [kesinOpen, setKesinOpen] = useState(false);
  const [hotOpen, setHotOpen] = useState(false);

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

  const kesinByTrainerMonth = useMemo(
    () => buildTrainerMonthMap(kesinAllocations),
    [kesinAllocations],
  );

  const hotByTrainerMonth = useMemo(
    () => buildTrainerMonthMap(hotAllocations),
    [hotAllocations],
  );

  const soldByMonth = months.map((month) =>
    trainers.reduce(
      (sum, [trainerId]) =>
        sum + (byTrainerMonth.get(`${trainerId}:${month}`) ?? 0),
      0,
    ),
  );
  const soldTotal = soldByMonth.reduce((a, b) => a + b, 0);

  const kesinByMonth = months.map((month) =>
    trainers.reduce(
      (sum, [trainerId]) =>
        sum + (kesinByTrainerMonth.get(`${trainerId}:${month}`) ?? 0),
      0,
    ),
  );
  const kesinTotal = kesinByMonth.reduce((a, b) => a + b, 0);

  const hotByMonth = months.map((month) =>
    trainers.reduce(
      (sum, [trainerId]) =>
        sum + (hotByTrainerMonth.get(`${trainerId}:${month}`) ?? 0),
      0,
    ),
  );
  const hotTotal = hotByMonth.reduce((a, b) => a + b, 0);

  const trainerCount = trainers.length;
  const potentialPerMonth = trainerCount * MAX_MONTHLY_DELIVERY_DAYS;
  const potentialTotal = potentialPerMonth * months.length;

  return (
    <section className="space-y-2">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Kapasite özeti</h2>
        <p className="text-sm text-slate-500">
          Planlanmış, kesin ve hot pipeline — ay bazında.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[280px] bg-slate-50 px-3 py-3 text-left">
                &nbsp;
              </th>
              {months.map((month) => (
                <th key={month} className="min-w-[110px] px-2 py-3 text-center">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="min-w-[110px] bg-slate-50 px-3 py-3 text-center font-bold">
                Toplam
              </th>
            </tr>
          </thead>
          <tbody>
            <MetricRow
              label="Planlanmış"
              expanded={soldOpen}
              onToggle={() => setSoldOpen((v) => !v)}
              values={soldByMonth}
              months={months}
              total={soldTotal}
            />
            {soldOpen &&
              trainers.map(([trainerId, trainerName]) => {
                const days = months.map(
                  (month) => byTrainerMonth.get(`${trainerId}:${month}`) ?? 0,
                );
                return (
                  <BreakdownRow
                    key={`sold-${trainerId}`}
                    name={trainerName}
                    days={days}
                    months={months}
                  />
                );
              })}

            <MetricRow
              label="Kesin ama planlanmamış"
              expanded={kesinOpen}
              onToggle={() => setKesinOpen((v) => !v)}
              values={kesinByMonth}
              months={months}
              total={kesinTotal}
            />
            {kesinOpen &&
              trainers.map(([trainerId, trainerName]) => {
                const days = months.map(
                  (month) =>
                    kesinByTrainerMonth.get(`${trainerId}:${month}`) ?? 0,
                );
                return (
                  <BreakdownRow
                    key={`kesin-${trainerId}`}
                    name={trainerName}
                    days={days}
                    months={months}
                  />
                );
              })}

            <MetricRow
              label="Hot"
              expanded={hotOpen}
              onToggle={() => setHotOpen((v) => !v)}
              values={hotByMonth}
              months={months}
              total={hotTotal}
            />
            {hotOpen &&
              trainers.map(([trainerId, trainerName]) => {
                const days = months.map(
                  (month) =>
                    hotByTrainerMonth.get(`${trainerId}:${month}`) ?? 0,
                );
                return (
                  <BreakdownRow
                    key={`hot-${trainerId}`}
                    name={trainerName}
                    days={days}
                    months={months}
                  />
                );
              })}

            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
                Potansiyel satılabilir
              </td>
              {months.map((month) => (
                <td
                  key={month}
                  className="px-2 py-3 text-center tabular-nums font-semibold text-slate-900"
                >
                  {potentialPerMonth}
                </td>
              ))}
              <td className="bg-slate-50 px-3 py-3 text-center font-bold tabular-nums text-slate-900">
                {potentialTotal}
              </td>
            </tr>

            <tr>
              <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
                Satılmış / kapasite
              </td>
              {soldByMonth.map((sold, i) => {
                const occupancy =
                  potentialPerMonth > 0 ? sold / potentialPerMonth : 0;
                return (
                  <td key={months[i]} className="p-1.5">
                    <div
                      className={`flex h-10 items-center justify-center rounded-md text-sm font-bold ${occupancyColor(occupancy, occupancy > 1)}`}
                    >
                      {formatPct(sold, potentialPerMonth)}
                    </div>
                  </td>
                );
              })}
              <td className="p-1.5">
                {(() => {
                  const occupancy =
                    potentialTotal > 0 ? soldTotal / potentialTotal : 0;
                  return (
                    <div
                      className={`flex h-10 items-center justify-center rounded-md text-sm font-bold ${occupancyColor(occupancy, occupancy > 1)}`}
                    >
                      {formatPct(soldTotal, potentialTotal)}
                    </div>
                  );
                })()}
              </td>
            </tr>

            <CapacityRatioRow
              label="Satılmış + planlanmamış / kapasite"
              months={months}
              valuesByMonth={months.map(
                (_, i) => soldByMonth[i] + kesinByMonth[i],
              )}
              totalValue={soldTotal + kesinTotal}
              potentialPerMonth={potentialPerMonth}
              potentialTotal={potentialTotal}
              percentOnly
            />

            <CapacityRatioRow
              label="Satılmış + planlanmamış + hot"
              months={months}
              valuesByMonth={months.map(
                (_, i) => soldByMonth[i] + kesinByMonth[i] + hotByMonth[i],
              )}
              totalValue={soldTotal + kesinTotal + hotTotal}
              potentialPerMonth={potentialPerMonth}
              potentialTotal={potentialTotal}
              percentOnly
            />
          </tbody>
        </table>
      </div>

      <p className="text-xs text-slate-500">
        Not: Potansiyel satılabilir, eğitmen başına ayda{" "}
        {MAX_MONTHLY_DELIVERY_DAYS}&apos;dir
        {trainerCount > 0
          ? ` (${trainerCount} kişi × ${MAX_MONTHLY_DELIVERY_DAYS} = ${potentialPerMonth}/ay)`
          : ""}
        . Satılmış + planlanmamış + hot %100&apos;ü geçerse kırmızıya döner.
      </p>
    </section>
  );
}

function CapacityRatioRow({
  label,
  months,
  valuesByMonth,
  totalValue,
  potentialPerMonth,
  potentialTotal,
  percentOnly = false,
}: {
  label: string;
  months: string[];
  valuesByMonth: number[];
  totalValue: number;
  potentialPerMonth: number;
  potentialTotal: number;
  percentOnly?: boolean;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
        {label}
      </td>
      {valuesByMonth.map((value, i) => {
        const occupancy =
          potentialPerMonth > 0 ? value / potentialPerMonth : 0;
        return (
          <td key={months[i]} className="p-1.5">
            <div
              className={`flex ${percentOnly ? "h-10" : "h-12 flex-col"} items-center justify-center rounded-md text-sm font-bold ${occupancyColor(occupancy, occupancy > 1)}`}
            >
              {percentOnly ? (
                formatPct(value, potentialPerMonth)
              ) : (
                <>
                  <span className="tabular-nums">{value}</span>
                  <span className="text-[11px] font-semibold">
                    {formatPct(value, potentialPerMonth)}
                  </span>
                </>
              )}
            </div>
          </td>
        );
      })}
      <td className="p-1.5">
        {(() => {
          const occupancy =
            potentialTotal > 0 ? totalValue / potentialTotal : 0;
          return (
            <div
              className={`flex ${percentOnly ? "h-10" : "h-12 flex-col"} items-center justify-center rounded-md text-sm font-bold ${occupancyColor(occupancy, occupancy > 1)}`}
            >
              {percentOnly ? (
                formatPct(totalValue, potentialTotal)
              ) : (
                <>
                  <span className="tabular-nums">{totalValue}</span>
                  <span className="text-[11px] font-semibold">
                    {formatPct(totalValue, potentialTotal)}
                  </span>
                </>
              )}
            </div>
          );
        })()}
      </td>
    </tr>
  );
}

function MetricRow({
  label,
  expanded,
  onToggle,
  values,
  months,
  total,
}: {
  label: string;
  expanded: boolean;
  onToggle: () => void;
  values: number[];
  months: string[];
  total: number;
}) {
  return (
    <tr>
      <td className="sticky left-0 z-10 bg-white px-3 py-3 font-semibold text-slate-800">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={expanded}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
          >
            {expanded ? "−" : "+"}
          </button>
          {label}
        </div>
      </td>
      {values.map((days, i) => (
        <td
          key={months[i]}
          className="px-2 py-3 text-center tabular-nums font-semibold text-slate-900"
        >
          {days}
        </td>
      ))}
      <td className="bg-slate-50 px-3 py-3 text-center font-bold tabular-nums text-slate-900">
        {total}
      </td>
    </tr>
  );
}

function BreakdownRow({
  name,
  days,
  months,
}: {
  name: string;
  days: number[];
  months: string[];
}) {
  const rowTotal = days.reduce((a, b) => a + b, 0);
  return (
    <tr className="bg-slate-50/80">
      <td className="sticky left-0 z-10 bg-slate-50 px-3 py-2 pl-12 text-sm text-slate-600">
        {name}
      </td>
      {days.map((value, i) => (
        <td
          key={`${name}-${months[i]}`}
          className="px-2 py-2 text-center text-sm tabular-nums text-slate-700"
        >
          {value}
        </td>
      ))}
      <td className="px-3 py-2 text-center text-sm font-medium tabular-nums text-slate-800">
        {rowTotal}
      </td>
    </tr>
  );
}
