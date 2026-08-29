"use client";

import { Fragment, useState } from "react";
import { formatTry } from "@/lib/pricing";
import type { RevenueBreakdownItem, RevenueGrid } from "@/lib/revenue";

type Props = {
  title: string;
  subtitle: string;
  grid: RevenueGrid;
};

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short", year: "2-digit" });
}

function formatAmount(amount: number): string {
  if (amount <= 0) return "—";
  return formatTry(amount);
}

export function RevenueView({ title, subtitle, grid }: Props) {
  const [openIds, setOpenIds] = useState<Set<string>>(new Set());

  function toggle(trainerId: string) {
    setOpenIds((current) => {
      const next = new Set(current);
      if (next.has(trainerId)) next.delete(trainerId);
      else next.add(trainerId);
      return next;
    });
  }

  return (
    <section className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{title}</h2>
        <p className="text-sm text-slate-500">{subtitle}</p>
        <p className="mt-1 text-xs text-slate-400">
          + ile satırı açın: gelirin hangi müşteriden geldiği görünür.
        </p>
      </div>

      <div className="card overflow-x-auto">
        <table className="data-table min-w-[960px]">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 w-[180px] bg-slate-50 px-3 py-3 text-left">
                Kişi
              </th>
              {grid.months.map((month) => (
                <th key={month} className="min-w-[120px] px-2 py-3 text-right">
                  {formatMonth(month)}
                </th>
              ))}
              <th className="min-w-[120px] bg-slate-50 px-3 py-3 text-right font-bold">
                Toplam
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => {
              const expanded = openIds.has(row.trainerId);
              return (
                <Fragment key={row.trainerId}>
                  <tr>
                    <td
                      className="sticky left-0 z-10 bg-white px-3 py-3 align-top font-semibold text-slate-800"
                      rowSpan={expanded ? 2 : 1}
                    >
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => toggle(row.trainerId)}
                          aria-expanded={expanded}
                          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-slate-200 bg-white text-base font-bold text-slate-700 hover:bg-slate-50"
                        >
                          {expanded ? "−" : "+"}
                        </button>
                        {row.trainerName}
                      </div>
                    </td>
                    {grid.months.map((month) => (
                      <td
                        key={month}
                        className="px-2 py-3 text-right align-top tabular-nums font-semibold text-slate-900"
                      >
                        {formatAmount(row.byMonth[month]?.amount ?? 0)}
                      </td>
                    ))}
                    <td className="bg-slate-50 px-3 py-3 text-right align-top font-bold tabular-nums text-slate-900">
                      {formatAmount(row.total.amount)}
                    </td>
                  </tr>
                  {expanded && (
                    <tr className="bg-slate-50/80">
                      {grid.months.map((month) => {
                        const items = row.breakdownByMonth?.[month] ?? [];
                        return (
                          <td
                            key={`${row.trainerId}-${month}-detail`}
                            className="border-t border-slate-100 px-1.5 py-2 align-top"
                          >
                            {items.length === 0 ? (
                              <p className="px-1 py-1 text-[11px] text-slate-400">
                                —
                              </p>
                            ) : (
                              <div className="flex flex-col gap-1">
                                {items.map((item) => (
                                  <BreakdownChip
                                    key={`${item.label}-${item.amount}`}
                                    item={item}
                                  />
                                ))}
                              </div>
                            )}
                          </td>
                        );
                      })}
                      <td className="border-t border-slate-100 bg-slate-50 px-2 py-2 align-top" />
                    </tr>
                  )}
                </Fragment>
              );
            })}
            <tr className="revenue-total-row">
              <td className="sticky left-0 z-10 px-3 py-3">Toplam</td>
              {grid.months.map((month) => (
                <td key={month} className="px-2 py-3 text-right tabular-nums">
                  {formatAmount(grid.columnTotals[month]?.amount ?? 0)}
                </td>
              ))}
              <td className="px-3 py-3 text-right tabular-nums">
                {formatAmount(grid.grandTotal.amount)}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}

function BreakdownChip({ item }: { item: RevenueBreakdownItem }) {
  return (
    <div className="rounded-md bg-white px-2 py-1.5 text-[11px] leading-snug ring-1 ring-slate-200">
      <div className="font-semibold text-slate-800">{item.label}</div>
      <div className="font-medium tabular-nums text-slate-600">
        {formatAmount(item.amount)}
      </div>
    </div>
  );
}
