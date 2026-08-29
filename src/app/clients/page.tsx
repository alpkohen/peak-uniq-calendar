import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getBookings } from "@/lib/data";
import { getClientsWithPricing } from "@/lib/pricing";
import { discoverClientLabels, trainersByClientLabel } from "@/lib/revenue";
import { ClientPricingView } from "@/components/ClientPricingView";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <>
        <PageHeader title="Fiyat" />
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </>
    );
  }

  try {
    const [clients, bookings] = await Promise.all([
      getClientsWithPricing(),
      getBookings(),
    ]);
    const suggestedNames = discoverClientLabels(bookings);
    const trainersByLabel = trainersByClientLabel(bookings);

    return (
      <>
        <PageHeader
          title="Fiyat"
          subtitle="Günlük satış fiyatı ve eğitmen hakedişi — müşteri bazında."
        />
        <ClientPricingView
          initialClients={clients}
          suggestedNames={suggestedNames}
          trainersByLabel={trainersByLabel}
        />
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Fiyat" />
        <ErrorBanner
          title="Veri hatası"
          message={formatError(error)}
        />
      </>
    );
  }
}
