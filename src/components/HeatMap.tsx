"use client";

import Link from "next/link";
import { Fragment, useMemo, useState } from "react";
import type { BookingWithClient, CapacitySummary } from "@/lib/types";
import {
  assignmentsForTrainerMonth,
  formatAssignmentDates,
  type AssignmentBlock,
} from "@/lib/assignments";
import {
  CAPACITY_LEGEND_BANDS,
  formatDeliveryCapacity,
  formatOccupancy,
  MAX_MONTHLY_DELIVERY_DAYS,
  occupancyColor,
} from "@/lib/capacity";
import { compareTrainerNames } from "@/lib/trainer-names";
import { clampCalendarMonth } from "@/lib/slots";

type Props = {
  months: string[];
  capacities: CapacitySummary[];
  bookings: BookingWithClient[];
};

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
}

export function HeatMap({ months, capacities, bookings }: Props) {
  const trainers = useMemo(
    () =>
      Array.from(
        new Map(capacities.map((c) => [c.trainerId, c.trainerName])).entries(),
      ).sort(([, a], [, b]) => compareTrainerNames(a, b)),
    [capacities],
  );

  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  const byTrainerMonth = new Map<string, CapacitySummary>();
  for (const c of capacities) {
    byTrainerMonth.set(`${c.trainerId}:${c.month}`, c);
  }

  const assignmentMap = useMemo(() => {
    const map = new Map<string, AssignmentBlock[]>();
    for (const [trainerId] of trainers) {
      for (const month of months) {
        map.set(
          `${trainerId}:${month}`,
          assignmentsForTrainerMonth(bookings, trainerId, month),
        );
      }
    }
    return map;
  }, [bookings, months, trainers]);

  function toggle(trainerId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(trainerId)) next.delete(trainerId);
      else next.add(trainerId);
      return next;
    });
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        + ile satırı açın: o ay hangi müşteride oldukları görünür. Yüzdeye
        tıklayınca takvime gidersiniz.
      </p>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[180px] bg-slate-50 px-3 py-3 text-left">
                Eğitmen
              </th>
              {months.map((month) => (
                <th key={month} className="min-w-[140px] px-2 py-3 text-center">
                  {formatMonth(month)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trainers.map(([trainerId, trainerName]) => {
              const expanded = openIds.has(trainerId);
              return (
                <Fragment key={trainerId}>
                  <tr>
                    <td
                      className="sticky left-0 z-10 bg-white px-3 py-3 align-top font-semibold text-slate-800"
                      rowSpan={expanded ? 2 : 1}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(trainerId)}
                          aria-expanded={expanded}
                          aria-label={
                            expanded
                              ? `${trainerName} detayını kapat`
                              : `${trainerName} detayını aç`
                          }
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {expanded ? "−" : "+"}
                        </button>
                        <Link
                          href={`/?trainer=${trainerId}`}
                          className="hover:text-blue-600"
                        >
                          {trainerName}
                        </Link>
                      </div>
                    </td>
                    {months.map((month) => {
                      const cap = byTrainerMonth.get(`${trainerId}:${month}`);
                      const pctLabel = cap ? formatOccupancy(cap.occupancy) : "—";
                      const hasData = cap && cap.deliveryDays > 0;

                      return (
                        <td key={month} className="p-1.5 align-top">
                          <Link
                            href={`/?trainer=${trainerId}&month=${clampCalendarMonth(month)}`}
                            className={`flex h-16 w-full flex-col items-center justify-center rounded-lg text-xs font-bold transition hover:ring-2 hover:ring-blue-400 ${occupancyColor(cap?.occupancy ?? 0)}`}
                            title={
                              cap
                                ? formatDeliveryCapacity(cap.deliveryDays)
                                : "Takvime git"
                            }
                          >
                            <span>{hasData ? pctLabel : "%0"}</span>
                            {cap && (
                              <span className="mt-0.5 text-[10px] font-medium opacity-90">
                                {formatDeliveryCapacity(cap.deliveryDays)}
                              </span>
                            )}
                          </Link>
                        </td>
                      );
                    })}
                  </tr>
                  {expanded && (
                    <tr className="bg-slate-50/80">
                      {months.map((month) => {
                        const items =
                          assignmentMap.get(`${trainerId}:${month}`) ?? [];
                        return (
                          <td
                            key={`${trainerId}-${month}-detail`}
                            className="border-t border-slate-100 px-1.5 py-2 align-top"
                          >
                            {items.length === 0 ? (
                              <p className="px-1 py-1 text-[11px] text-slate-400">
                                —
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {items.map((item) => (
                                  <AssignmentChip
                                    key={`${item.start}-${item.label}-${item.kind}`}
                                    item={item}
                                  />
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="space-y-2 text-xs text-slate-500">
        <p>
          Doluluk oranı = teslimat günü ÷ {MAX_MONTHLY_DELIVERY_DAYS}. Referans
          çizgileri: 5 (%25), 10 (%50), 15 (%75), 20 (%100) gün.
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-2">
          {CAPACITY_LEGEND_BANDS.map((item) => (
            <Legend
              key={item.label}
              color={item.color}
              label={item.label}
              range={item.range}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

function AssignmentChip({ item }: { item: AssignmentBlock }) {
  const isBlock = item.kind === "block";
  return (
    <div
      className={`rounded-md px-2 py-1.5 text-[11px] leading-snug ring-1 ${
        isBlock
          ? "bg-slate-200/80 text-slate-600 ring-slate-200"
          : "bg-white text-slate-800 ring-slate-200"
      }`}
      title={item.title ?? item.label}
    >
      <div className="font-semibold">{item.label}</div>
      <div className="text-slate-500">
        {formatAssignmentDates(item.start, item.end)}
        {item.place ? ` · ${item.place}` : ""}
      </div>
    </div>
  );
}

function Legend({
  color,
  label,
  range,
}: {
  color: string;
  label: string;
  range: string;
}) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-4 w-4 shrink-0 rounded ${color}`} />
      <span>
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="text-slate-500"> — {range}</span>
      </span>
    </span>
  );
}
