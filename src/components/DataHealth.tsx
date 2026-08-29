import type { TrainerSyncHealth, UnmatchedBooking } from "@/lib/types";

type Props = {
  unmatched: UnmatchedBooking[];
  syncHealth: TrainerSyncHealth[];
};

function formatDateTime(iso: string | null): string {
  if (!iso) return "Hiç senkron yok";
  return new Date(iso).toLocaleString("tr-TR");
}

export function DataHealth({ unmatched, syncHealth }: Props) {
  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 text-lg font-semibold">
          Eşleşmeyen Etkinlik Başlıkları
        </h2>
        {unmatched.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            Tüm etkinlikler bir müşteriye bağlı.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                  <th className="px-3 py-2">Eğitmen</th>
                  <th className="px-3 py-2">Tarih</th>
                  <th className="px-3 py-2">Dönem</th>
                  <th className="px-3 py-2">Başlık</th>
                </tr>
              </thead>
              <tbody>
                {unmatched.map((row) => (
                  <tr key={row.id} className="border-b border-[var(--border)]">
                    <td className="px-3 py-2">{row.trainerName}</td>
                    <td className="px-3 py-2">{row.date}</td>
                    <td className="px-3 py-2 uppercase">
                      {row.slot === "am" ? "ÖÖ" : "ÖS"}
                    </td>
                    <td className="px-3 py-2">{row.rawTitle}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-5">
        <h2 className="mb-4 text-lg font-semibold">Senkron Durumu</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] text-left text-[var(--muted)]">
                <th className="px-3 py-2">Eğitmen</th>
                <th className="px-3 py-2">Son Senkron</th>
                <th className="px-3 py-2">Son 30 Gün Etkinlik</th>
                <th className="px-3 py-2">14 Gün Boş?</th>
              </tr>
            </thead>
            <tbody>
              {syncHealth.map((row) => (
                <tr key={row.trainerId} className="border-b border-[var(--border)]">
                  <td className="px-3 py-2 font-medium">{row.trainerName}</td>
                  <td className="px-3 py-2">{formatDateTime(row.lastSyncedAt)}</td>
                  <td className="px-3 py-2">{row.eventsLast30Days}</td>
                  <td className="px-3 py-2">
                    {row.calendarEmpty14Days ? (
                      <span className="rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                        Evet — takip gerekli
                      </span>
                    ) : (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                        Hayır
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
