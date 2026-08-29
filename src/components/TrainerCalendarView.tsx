"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  parseISO,
  startOfMonth,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import {
  calculateCapacity,
  calendarDayLabel,
  clientColor,
  formatDeliveryCapacity,
  remainingDeliveryDays,
} from "@/lib/capacity";
import { isWorkday } from "@/lib/holidays";
import {
  CALENDAR_START_MONTH,
  clampCalendarMonth,
} from "@/lib/slots";
import type { BookingWithClient, Trainer } from "@/lib/types";

type Props = {
  trainers: Trainer[];
  bookings: BookingWithClient[];
  selectedTrainerId: string;
  selectedMonth: string;
};

const WEEKDAYS = ["Pzt", "Sal", "Çar", "Per", "Cum", "Cmt", "Paz"];

function monthLabel(month: string): string {
  const date = parseISO(`${month}-01`);
  return format(date, "MMMM yyyy", { locale: tr });
}

export function TrainerCalendarView({
  trainers,
  bookings,
  selectedTrainerId,
  selectedMonth,
}: Props) {
  const router = useRouter();
  const trainer =
    trainers.find((item) => item.id === selectedTrainerId) ?? trainers[0];
  const trainerBookings = bookings.filter((b) => b.trainer_id === trainer?.id);
  const month = clampCalendarMonth(selectedMonth);

  if (!trainer) {
    return (
      <div className="card p-8 text-center text-slate-500">
        Aktif eğitmen bulunamadı.
      </div>
    );
  }

  const monthStart = startOfMonth(parseISO(`${month}-01`));
  const monthEnd = endOfMonth(monthStart);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });
  const calendarStart = startOfMonth(parseISO(`${CALENDAR_START_MONTH}-01`));
  const canGoPrev = monthStart > calendarStart;

  const bookingMap = new Map<string, BookingWithClient>();
  for (const booking of trainerBookings) {
    bookingMap.set(`${booking.date}:${booking.slot}`, booking);
  }

  const capacity = calculateCapacity(trainer, trainerBookings, month);

  function navigate(nextMonth: string, trainerId: string) {
    router.push(
      `/?trainer=${trainerId}&month=${clampCalendarMonth(nextMonth)}`,
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {trainers.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => navigate(month, item.id)}
            className={`rounded-full px-4 py-2 text-sm font-semibold transition ${
              item.id === trainer.id
                ? "bg-blue-600 text-white shadow-sm"
                : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
            }`}
          >
            {item.full_name}
          </button>
        ))}
      </div>

      <div className="card flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center justify-center gap-2 sm:justify-start">
          <button
            type="button"
            disabled={!canGoPrev}
            onClick={() =>
              navigate(format(addMonths(monthStart, -1), "yyyy-MM"), trainer.id)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
          >
            ←
          </button>
          <h3 className="min-w-[180px] text-center text-lg font-bold capitalize text-slate-900">
            {monthLabel(month)}
          </h3>
          <button
            type="button"
            onClick={() =>
              navigate(format(addMonths(monthStart, 1), "yyyy-MM"), trainer.id)
            }
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium hover:bg-slate-50"
          >
            →
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Teslimat" value={`${capacity.deliveryDays} gün`} />
          <Stat label="Blok" value={`${Math.ceil(capacity.blockSlot / 2)} gün`} />
          <Stat
            label="Doluluk"
            value={formatDeliveryCapacity(capacity.deliveryDays)}
          />
          <Stat
            label="Müsait"
            value={`${remainingDeliveryDays(capacity.deliveryDays)} gün`}
          />
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[720px]">
            <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-slate-500"
                >
                  {day}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7 auto-rows-[minmax(96px,auto)]">
              {days.map((day) => {
                const dateStr = format(day, "yyyy-MM-dd");
                const inMonth = isSameMonth(day, monthStart);
                const workday = isWorkday(dateStr);
                const am = bookingMap.get(`${dateStr}:am`);
                const pm = bookingMap.get(`${dateStr}:pm`);

                return (
                  <div
                    key={dateStr}
                    className={`flex flex-col border-b border-r border-slate-200 p-2 ${
                      inMonth ? "bg-white" : "bg-slate-50"
                    } ${!workday && inMonth ? "bg-slate-100/70" : ""}`}
                  >
                    <div
                      className={`mb-1.5 text-right text-xs font-semibold ${
                        inMonth ? "text-slate-700" : "text-slate-300"
                      }`}
                    >
                      {format(day, "d")}
                    </div>
                    <div className="flex flex-1 flex-col">
                      {inMonth && workday ? (
                        <DayCell am={am} pm={pm} />
                      ) : inMonth && !workday ? (
                        <p className="flex flex-1 items-center justify-center text-center text-[11px] text-slate-400">
                          Tatil
                        </p>
                      ) : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-4 text-xs text-slate-500">
        <Legend color="bg-emerald-100 ring-1 ring-emerald-200" label="Teslimat / müşteri" />
        <Legend color="bg-slate-200" label="Blok / izin" />
        <Legend color="border border-dashed border-slate-300 bg-white" label="Boş" />
      </div>

      <p className="text-sm text-slate-500">
        Tüm eğitmenlerin doluluğu ve müşteri detayı için{" "}
        <Link href="/overview" className="font-semibold text-blue-600 hover:underline">
          Özet
        </Link>
        .
      </p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2 ring-1 ring-slate-100">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="text-base font-bold text-slate-900">{value}</p>
    </div>
  );
}

function DayCell({
  am,
  pm,
}: {
  am?: BookingWithClient;
  pm?: BookingWithClient;
}) {
  if (!am && !pm) {
    return (
      <div className="flex flex-1 items-center justify-center rounded-md border border-dashed border-slate-200 bg-slate-50/50 px-1 py-2 text-[11px] text-slate-400">
        Boş
      </div>
    );
  }

  const lines: string[] = [];
  const amLabel = am
    ? calendarDayLabel(am.kind, am.raw_title, am.client?.name)
    : null;
  const pmLabel = pm
    ? calendarDayLabel(pm.kind, pm.raw_title, pm.client?.name)
    : null;

  if (amLabel && pmLabel && amLabel === pmLabel) {
    lines.push(amLabel);
  } else {
    if (amLabel) lines.push(amLabel);
    if (pmLabel && pmLabel !== amLabel) lines.push(pmLabel);
  }

  const primary = am ?? pm!;
  const isBlock = primary.kind === "block";
  const bg = isBlock
    ? "#e2e8f0"
    : clientColor(primary.client?.name ?? lines[0] ?? "");

  return (
    <div
      className="flex flex-1 flex-col justify-center rounded-md px-1.5 py-1.5 text-[11px] font-semibold leading-tight text-slate-800 ring-1 ring-black/5"
      style={{ backgroundColor: bg }}
      title={[am?.raw_title, pm?.raw_title].filter(Boolean).join(" / ")}
    >
      {lines.map((line, index) => (
        <div key={`${line}-${index}`} className="truncate">
          {line}
        </div>
      ))}
    </div>
  );
}

function Legend({ color, label }: { color: string; label: string }) {
  return (
    <span className="flex items-center gap-2">
      <span className={`inline-block h-3.5 w-3.5 rounded ${color}`} />
      {label}
    </span>
  );
}
