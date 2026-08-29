import { ensureDefaultTrainers } from "@/lib/trainers";
import { ImportForm } from "@/components/ImportForm";

export const dynamic = "force-dynamic";

export default async function ImportPage() {
  await ensureDefaultTrainers();

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold">Toplu Tarih Yükleme</h2>
        <p className="mt-1 text-sm text-[var(--muted)]">
          Peak eğitmenlerinin (Sühan, Ümit, Muhammed, Taner) gönderdiği takvim
          görsellerini veya CSV dosyalarını tek seferde sisteme kaydedin.
        </p>
      </div>
      <ImportForm />
    </div>
  );
}
