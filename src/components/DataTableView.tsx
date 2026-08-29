"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  assignmentWorkdays,
  assignmentsForTrainer,
  formatAssignmentDates,
} from "@/lib/assignments";
import type { BookingWithClient, Trainer } from "@/lib/types";

type Props = {
  trainers: Trainer[];
  bookings: BookingWithClient[];
};

export function DataTableView({ trainers, bookings }: Props) {
  const [activeId, setActiveId] = useState(trainers[0]?.id ?? "");

  useEffect(() => {
    const ids = trainers.map((t) => t.id);
    const elements = ids
      .map((id) => document.getElementById(`veri-${id}`))
      .filter((el): el is HTMLElement => el !== null);

    if (elements.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (visible?.target.id) {
          setActiveId(visible.target.id.replace("veri-", ""));
        }
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0.1 },
    );

    for (const el of elements) observer.observe(el);
    return () => observer.disconnect();
  }, [trainers]);

  function jumpTo(trainerId: string) {
    setActiveId(trainerId);
    document.getElementById(`veri-${trainerId}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <div className="flex gap-4 lg:gap-6">
      <aside className="sticky top-24 z-20 hidden h-fit w-[132px] shrink-0 sm:block">
        <p className="mb-2 px-1 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
          Kişi
        </p>
        <div className="flex flex-col gap-1.5">
          {trainers.map((trainer) => (
            <button
              key={trainer.id}
              type="button"
              onClick={() => jumpTo(trainer.id)}
              className={`rounded-lg px-3 py-2 text-left text-sm font-semibold transition ${
                activeId === trainer.id
                  ? "bg-blue-600 text-white shadow-sm"
                  : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              }`}
            >
              {trainer.full_name}
            </button>
          ))}
        </div>
      </aside>

      <div className="min-w-0 flex-1 space-y-6">
        <div className="flex gap-1.5 overflow-x-auto sm:hidden">
          {trainers.map((trainer) => (
            <button
              key={trainer.id}
              type="button"
              onClick={() => jumpTo(trainer.id)}
              className={`shrink-0 rounded-lg px-3 py-2 text-sm font-semibold ${
                activeId === trainer.id
                  ? "bg-blue-600 text-white"
                  : "bg-white text-slate-700 ring-1 ring-slate-200"
              }`}
            >
              {trainer.full_name}
            </button>
          ))}
        </div>

        {trainers.map((trainer) => {
          const rows = assignmentsForTrainer(bookings, trainer.id);
          return (
            <section
              key={trainer.id}
              id={`veri-${trainer.id}`}
              className="scroll-mt-28"
            >
              <div className="card overflow-hidden">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
                  <h2 className="text-base font-bold text-slate-900">
                    {trainer.full_name}
                  </h2>
                  <span className="text-xs text-slate-500">
                    {rows.length} kayıt
                  </span>
                </div>

                {rows.length === 0 ? (
                  <p className="px-4 py-8 text-sm text-slate-500">
                    Bu kişi için kayıt yok.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="data-table min-w-[720px]">
                      <thead>
                        <tr>
                          <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left">
                            Kim
                          </th>
                          <th className="px-4 py-3 text-left">Nerede</th>
                          <th className="px-4 py-3 text-left">Ne zaman</th>
                          <th className="px-4 py-3 text-left">Süre</th>
                          <th className="px-4 py-3 text-left">Tür</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((row) => (
                          <tr key={`${row.start}-${row.label}-${row.kind}`}>
                            <td className="sticky left-0 z-10 bg-white px-4 py-3 font-semibold text-slate-800">
                              <Link
                                href={`/?trainer=${trainer.id}&month=${row.start.slice(0, 7)}`}
                                className="hover:text-blue-600"
                              >
                                {trainer.full_name}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <div className="font-medium text-slate-800">
                                {row.label}
                              </div>
                              {row.place && (
                                <div className="text-xs text-slate-500">
                                  {row.place}
                                </div>
                              )}
                              {row.title && row.title !== row.label && (
                                <div className="mt-0.5 text-xs text-slate-400">
                                  {row.title}
                                </div>
                              )}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-slate-700">
                              {formatAssignmentDates(row.start, row.end)}
                            </td>
                            <td className="px-4 py-3 text-slate-700">
                              {assignmentWorkdays(row.start, row.end)} gün
                            </td>
                            <td className="px-4 py-3">
                              <span
                                className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                                  row.kind === "block"
                                    ? "bg-slate-200 text-slate-700"
                                    : "bg-emerald-50 text-emerald-800"
                                }`}
                              >
                                {row.kind === "block" ? "Blok / izin" : "Teslimat"}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
