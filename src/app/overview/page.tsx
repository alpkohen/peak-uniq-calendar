import { calculateCapacity } from "@/lib/capacity";
import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getActiveTrainers, getBookings } from "@/lib/data";
import { flattenHotAllocations, getHotClients } from "@/lib/hot";
import { monthRangeFromBookings } from "@/lib/slots";
import { ErrorBanner } from "@/components/ErrorBanner";
import { HeatMap } from "@/components/HeatMap";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function OverviewPage() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Özet</h2>
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </div>
    );
  }

  try {
    const [trainers, bookings, hotClients] = await Promise.all([
      getActiveTrainers(),
      getBookings(),
      getHotClients(),
    ]);
    const months = monthRangeFromBookings(bookings);
    const kesinAllocations = flattenHotAllocations(hotClients, trainers, "kesin");
    const hotAllocations = flattenHotAllocations(hotClients, trainers, "hot");

    const capacities = trainers.flatMap((trainer) =>
      months.map((month) =>
        calculateCapacity(
          trainer,
          bookings.filter((b) => b.trainer_id === trainer.id),
          month,
        ),
      ),
    );

    return (
      <>
        <PageHeader
          title="Özet"
          subtitle="Satırı açınca o ay hangi müşteride oldukları görünür."
        />

        {trainers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">Henüz veri yok.</div>
        ) : (
          <HeatMap
            months={months}
            capacities={capacities}
            bookings={bookings}
            kesinAllocations={kesinAllocations}
            hotAllocations={hotAllocations}
          />
        )}
      </>
    );
  } catch (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-semibold">Özet</h2>
        <ErrorBanner
          title="Supabase bağlantı hatası"
          message={formatError(error)}
        />
      </div>
    );
  }
}
