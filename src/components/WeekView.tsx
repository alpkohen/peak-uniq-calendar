import {
  addDays,
  endOfWeek,
  format,
  parseISO,
  startOfWeek,
} from "date-fns";
import { tr } from "date-fns/locale";
import type { BookingWithClient } from "@/lib/types";
import { clientColor } from "@/lib/capacity";

type Props = {
  trainers: { id: string; full_name: string }[];
  bookings: BookingWithClient[];
  weekStart?: string;
};

function slotLabel(slot: "am" | "pm"): string {
  return slot === "am" ? "ÖÖ" : "ÖS";
}

export function WeekView({ trainers, bookings, weekStart }: Props) {
  const base = weekStart ? parseISO(weekStart) : new Date();
  const start = startOfWeek(base, { weekStartsOn: 1 });
  const end = endOfWeek(base, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));

  const bookingMap = new Map<string, BookingWithClient>();
  for (const b of bookings) {
    bookingMap.set(`${b.trainer_id}:${b.date}:${b.slot}`, b);
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[var(--muted)]">
        {format(start, "d MMM", { locale: tr })} –{" "}
        {format(end, "d MMM yyyy", { locale: tr })}
      </p>

      <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)]">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-slate-50">
              <th className="sticky left-0 z-10 bg-slate-50 px-4 py-3 text-left">
                Eğitmen
              </th>
              {days.map((day) => (
                <th
                  key={day.toISOString()}
                  className="min-w-[120px] px-2 py-3 text-center font-medium"
                >
                  <div>{format(day, "EEE", { locale: tr })}</div>
                  <div className="text-xs font-normal text-[var(--muted)]">
                    {format(day, "d MMM", { locale: tr })}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {trainers.map((trainer) => (
              <tr
                key={trainer.id}
                className="border-b border-[var(--border)] align-top"
              >
                <td className="sticky left-0 z-10 bg-white px-4 py-3 font-medium">
                  {trainer.full_name}
                </td>
                {days.map((day) => {
                  const dateStr = format(day, "yyyy-MM-dd");
                  const am = bookingMap.get(`${trainer.id}:${dateStr}:am`);
                  const pm = bookingMap.get(`${trainer.id}:${dateStr}:pm`);

                  return (
                    <td key={dateStr} className="p-1">
                      <div className="flex min-h-[72px] flex-col gap-1">
                        <SlotCell booking={am} />
                        <SlotCell booking={pm} />
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function SlotCell({ booking }: { booking?: BookingWithClient }) {
  if (!booking) {
    return (
      <div className="flex h-8 items-center justify-center rounded border border-dashed border-slate-200 bg-slate-50 text-[10px] text-slate-400">
        boş
      </div>
    );
  }

  const label =
    booking.kind === "block"
      ? booking.raw_title ?? "Blok"
      : booking.client?.name ?? booking.raw_title ?? "Atanmamış";

  const bg =
    booking.kind === "block"
      ? "#e2e8f0"
      : clientColor(booking.client?.name ?? label);

  return (
    <div
      className="flex h-8 items-center gap-1 rounded px-2 text-[10px] font-medium text-slate-800"
      style={{ backgroundColor: bg }}
      title={booking.raw_title ?? undefined}
    >
      <span className="shrink-0 opacity-60">{slotLabel(booking.slot)}</span>
      <span className="truncate">{label}</span>
    </div>
  );
}
