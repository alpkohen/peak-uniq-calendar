import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getActiveTrainers, getBookings } from "@/lib/data";
import { DataTableView } from "@/components/DataTableView";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function DataPage() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <>
        <PageHeader title="Veriler" />
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </>
    );
  }

  try {
    const trainers = await getActiveTrainers();
    const bookings = await getBookings();

    return (
      <>
        <PageHeader
          title="Veriler"
          subtitle="Kim, nerede, ne zaman — tüm kayıtlar kişiye göre."
        />
        {trainers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            Henüz eğitmen verisi yok.
          </div>
        ) : (
          <DataTableView trainers={trainers} bookings={bookings} />
        )}
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Veriler" />
        <ErrorBanner
          title="Supabase bağlantı hatası"
          message={formatError(error)}
        />
      </>
    );
  }
}
