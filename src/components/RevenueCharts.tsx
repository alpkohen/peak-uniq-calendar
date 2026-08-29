"use client";

import { formatTry } from "@/lib/pricing";
import type { RevenueGrid } from "@/lib/revenue";

const BAR_SHADES = ["#475569", "#64748b", "#94a3b8", "#cbd5e1"];

type Props = {
  peakGrid: RevenueGrid;
  trainerGrid: RevenueGrid;
};

type BarItem = {
  key: string;
  label: string;
  amount: number;
  color: string;
};

function formatMonthShort(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "short" });
}

function compactTry(amount: number): string {
  if (amount >= 1_000_000) {
    return `₺${(amount / 1_000_000).toLocaleString("tr-TR", { maximumFractionDigits: 1 })}M`;
  }
  if (amount >= 1_000) {
    return `₺${Math.round(amount / 1_000)}K`;
  }
  return formatTry(amount);
}

function VerticalBarChart({
  items,
  emptyMessage,
}: {
  items: BarItem[];
  emptyMessage: string;
}) {
  const maxAmount = Math.max(...items.map((item) => item.amount), 1);
  const hasData = items.some((item) => item.amount > 0);

  if (!hasData) {
    return (
      <p className="flex h-52 items-center justify-center text-sm text-slate-400">
        {emptyMessage}
      </p>
    );
  }

  return (
    <div className="flex h-52 gap-2 border-b border-slate-200 pb-1">
      {items.map((item) => {
        const barHeight =
          item.amount > 0
            ? Math.max(Math.round((item.amount / maxAmount) * 100), 8)
            : 0;

        return (
          <div
            key={item.key}
            className="flex min-w-0 flex-1 flex-col items-center"
          >
            <span className="mb-2 h-4 shrink-0 text-[10px] font-medium tabular-nums text-slate-600">
              {item.amount > 0 ? compactTry(item.amount) : ""}
            </span>
            <div className="flex w-full flex-1 items-end justify-center">
              <div
                className="w-full max-w-[52px] rounded-t-md transition-all"
                style={{
                  height: `${barHeight}%`,
                  backgroundColor: item.color,
                  minHeight: item.amount > 0 ? "6px" : 0,
                }}
                title={formatTry(item.amount)}
              />
            </div>
            <span className="mt-2 shrink-0 text-center text-[10px] font-medium uppercase leading-tight text-slate-500">
              {item.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function RevenueCharts({ peakGrid, trainerGrid }: Props) {
  const monthlyItems: BarItem[] = peakGrid.months.map((month, index) => ({
    key: month,
    label: formatMonthShort(month),
    amount: peakGrid.columnTotals[month]?.amount ?? 0,
    color: "#475569",
  }));

  const trainerItems: BarItem[] = peakGrid.rows
    .map((row, index) => ({
      key: row.trainerId,
      label: row.trainerName,
      amount: row.total.amount,
      color: BAR_SHADES[index % BAR_SHADES.length],
    }))
    .filter((row) => row.amount > 0)
    .sort((a, b) => b.amount - a.amount);

  const hakedisTotal = trainerGrid.grandTotal.amount;
  const ciroTotal = peakGrid.grandTotal.amount;

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="card p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Aylık Peak cirosu</h3>
            <p className="text-xs text-slate-500">Ay bazında toplam gelir</p>
          </div>
          <p className="text-sm font-bold text-slate-800">{formatTry(ciroTotal)}</p>
        </div>
        <VerticalBarChart
          items={monthlyItems}
          emptyMessage="Henüz fiyatlandırılmış aylık ciro yok."
        />
      </div>

      <div className="card p-5">
        <div className="mb-4 flex items-end justify-between gap-3">
          <div>
            <h3 className="font-semibold text-slate-900">Kişi bazında ciro</h3>
            <p className="text-xs text-slate-500">
              Eğitmenlere göre pay · hakediş toplamı{" "}
              <span className="font-semibold text-slate-700">
                {formatTry(hakedisTotal)}
              </span>
            </p>
          </div>
        </div>
        <VerticalBarChart
          items={trainerItems}
          emptyMessage="Henüz fiyatlandırılmış kişi cirosu yok."
        />
      </div>
    </div>
  );
}
