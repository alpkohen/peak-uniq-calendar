import { getSupabaseConfigError, formatError } from "@/lib/config";
import { getActiveTrainers, getBookings } from "@/lib/data";
import {
  clampCalendarMonth,
  defaultCalendarMonth,
} from "@/lib/slots";
import { ErrorBanner } from "@/components/ErrorBanner";
import { PageHeader } from "@/components/PageHeader";
import { TrainerCalendarView } from "@/components/TrainerCalendarView";

export const dynamic = "force-dynamic";

type Props = {
  searchParams: Promise<{ trainer?: string; month?: string }>;
};

export default async function HomePage({ searchParams }: Props) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return (
      <>
        <PageHeader title="Eğitmen Takvimi" />
        <ErrorBanner title="Yapılandırma hatası" message={configError} />
      </>
    );
  }

  try {
    const params = await searchParams;
    const trainers = await getActiveTrainers();
    const bookings = await getBookings();

    const selectedTrainerId =
      params.trainer && trainers.some((t) => t.id === params.trainer)
        ? params.trainer
        : trainers[0]?.id;

    const selectedMonth = clampCalendarMonth(
      params.month && /^\d{4}-\d{2}$/.test(params.month)
        ? params.month
        : defaultCalendarMonth(),
    );

    return (
      <>
        <PageHeader
          title="Eğitmen Takvimi"
          subtitle="Kişi seçin, ay ay nerede olduklarını görün."
        />

        {trainers.length === 0 ? (
          <div className="card p-8 text-center text-slate-500">
            Henüz eğitmen verisi yok.
          </div>
        ) : (
          <TrainerCalendarView
            trainers={trainers}
            bookings={bookings}
            selectedTrainerId={selectedTrainerId}
            selectedMonth={selectedMonth}
          />
        )}
      </>
    );
  } catch (error) {
    return (
      <>
        <PageHeader title="Eğitmen Takvimi" />
        <ErrorBanner
          title="Supabase bağlantı hatası"
          message={formatError(error)}
        />
      </>
    );
  }
}
