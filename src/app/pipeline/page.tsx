import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getActiveTrainers, getBookings } from "@/lib/data";
import { getHotClients } from "@/lib/hot";
import { monthRangeFromBookings } from "@/lib/slots";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { PipelineView } from "@/components/PipelineView";

export const dynamic = "force-dynamic";

export default async function PipelinePage() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </>
    );
  }

  try {
    const [trainers, bookings, clients] = await Promise.all([
      getActiveTrainers(),
      getBookings(),
      getHotClients(),
    ]);
    const months = monthRangeFromBookings(bookings);

    return (
      <>
        <PageHeader
          title="Pipeline"
          subtitle="Kesin ve hot müşteriler — potansiyel gün ve günlük fiyat. Satırı açıp eğitmene ay bazında gün yazın."
        />
        <PipelineView
          initialClients={clients}
          trainers={trainers}
          months={months}
        />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Pipeline" />
        <ErrorBanner title="Veri hatası" message={formatError(error)} />
      </>
    );
  }
}
