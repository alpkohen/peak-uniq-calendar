import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getActiveTrainers, getBookings, getClients } from "@/lib/data";
import { getAllClientPricing } from "@/lib/pricing";
import { buildRevenueGrid } from "@/lib/revenue";
import { monthRangeFromBookings } from "@/lib/slots";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { RevenueCharts } from "@/components/RevenueCharts";
import { RevenueView } from "@/components/RevenueView";

export const dynamic = "force-dynamic";

export default async function RevenuePage() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <>
        <PageHeader title="Gelir" />
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </>
    );
  }

  try {
    const [trainers, bookings, clients, pricing] = await Promise.all([
      getActiveTrainers(),
      getBookings(),
      getClients(),
      getAllClientPricing(),
    ]);

    const months = monthRangeFromBookings(bookings);
    const peakGrid = buildRevenueGrid(
      trainers,
      bookings,
      clients,
      pricing,
      months,
      "peak",
    );
    const trainerGrid = buildRevenueGrid(
      trainers,
      bookings,
      clients,
      pricing,
      months,
      "trainer",
    );

    return (
      <>
        <PageHeader
          title="Gelir"
          subtitle="Aylık ve kişi bazında Peak cirosu ile eğitmen hakedişleri."
        />

        <RevenueCharts peakGrid={peakGrid} trainerGrid={trainerGrid} />

        <div className="space-y-10">
          <RevenueView
            title="Peak cirosu"
            subtitle="Müşteri satış fiyatları × teslimat günü. Kişi ve ay bazında toplam."
            grid={peakGrid}
          />

          <RevenueView
            title="Eğitmen hakedişi"
            subtitle="Müşteri fiyatlarına göre hesaplanan kişisel gelir (% veya sabit TL/gün)."
            grid={trainerGrid}
          />
        </div>

        {pricing.length === 0 ? (
          <p className="mt-6 text-sm text-amber-700">
            Henüz müşteri fiyatı girilmedi.{" "}
            <a href="/clients" className="font-medium underline">
              Fiyat
            </a>{" "}
            sekmesinden satış ve hakediş tanımlayın.
          </p>
        ) : null}
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Gelir" />
        <ErrorBanner title="Veri hatası" message={formatError(error)} />
      </>
    );
  }
}
