"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  buildClientTrainerMatrix,
  monthsFromBookings,
} from "@/lib/matrix";
import type { BookingWithClient, Trainer } from "@/lib/types";

type Props = {
  trainers: Trainer[];
  bookings: BookingWithClient[];
};

function formatMonth(month: string): string {
  const [year, m] = month.split("-");
  const date = new Date(Number(year), Number(m) - 1, 1);
  return date.toLocaleDateString("tr-TR", { month: "long", year: "numeric" });
}

export function ClientMatrix({ trainers, bookings }: Props) {
  const months = useMemo(() => monthsFromBookings(bookings), [bookings]);
  const [month, setMonth] = useState<string>("all");

  const rows = useMemo(
    () =>
      buildClientTrainerMatrix(
        trainers,
        bookings,
        month === "all" ? undefined : month,
      ),
    [trainers, bookings, month],
  );

  return (
    <div className="space-y-4">
      <div className="card flex flex-wrap items-end gap-4 p-4">
        <label className="text-sm">
          <span className="mb-1.5 block font-semibold text-slate-700">Dönem</span>
          <select
            value={month}
            onChange={(e) => setMonth(e.target.value)}
            className="min-w-[200px] rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm"
          >
            <option value="all">Tümü</option>
            {months.map((m) => (
              <option key={m} value={m}>
                {formatMonth(m)}
              </option>
            ))}
          </select>
        </label>
        <p className="pb-2 text-sm text-slate-500">
          Hücre = o müşteride o eğitmenin teslimat günü sayısı
        </p>
      </div>

      {rows.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          Bu dönemde teslimat kaydı yok.
        </div>
      ) : (
        <div className="card overflow-x-auto">
          <table className="data-table min-w-[720px]">
            <thead>
              <tr>
                <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left">
                  Müşteri
                </th>
                {trainers.map((trainer) => (
                  <th
                    key={trainer.id}
                    className="min-w-[96px] px-3 py-3 text-center"
                  >
                    <Link
                      href={`/?trainer=${trainer.id}`}
                      className="hover:text-blue-600"
                    >
                      {trainer.full_name}
                    </Link>
                  </th>
                ))}
                <th className="px-3 py-3 text-center">Toplam</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.key}>
                  <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium text-slate-800">
                    {row.label}
                  </td>
                  {trainers.map((trainer) => {
                    const cell = row.cells[trainer.id];
                    const days = cell?.deliveryDays ?? 0;
                    return (
                      <td key={trainer.id} className="p-2 text-center">
                        {days > 0 ? (
                          <Link
                            href={`/?trainer=${trainer.id}${month !== "all" ? `&month=${month}` : ""}`}
                            className="inline-flex min-w-[56px] flex-col items-center rounded-lg bg-emerald-50 px-2 py-2 text-emerald-900 ring-1 ring-emerald-100 hover:bg-emerald-100"
                            title={cell.programs.join("\n")}
                          >
                            <span className="text-lg font-bold leading-none">
                              {days}
                            </span>
                            <span className="mt-1 text-[10px] font-medium">gün</span>
                          </Link>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    );
                  })}
                  <td className="px-3 py-3 text-center font-bold text-slate-700">
                    {row.totalDays}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
