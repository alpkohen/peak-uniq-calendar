export type VisionExtractedRow = {
  trainer: string;
  date: string;
  slot: "am" | "pm" | "tam";
  kind: "teslimat" | "blok" | "delivery" | "block";
  title: string;
};

const TRAINER_HINTS = ["Sühan", "Ümit", "Muhammed", "Taner"];

function buildPrompt(trainerHint?: string): string {
  const trainers = trainerHint
    ? `${trainerHint} (ve listedeki diğerleri: ${TRAINER_HINTS.join(", ")})`
    : TRAINER_HINTS.join(", ");

  return `Bu görsel bir eğitmenin takvim/doluluk planıdır. Peak firmasının eğitmenleri: ${trainers}.

Görseldeki tüm dolu günleri ve etkinlikleri çıkar. Sadece geçerli JSON dizisi döndür, başka metin yazma.

Her kayıt şu alanlara sahip olsun:
- trainer: eğitmen adı (Sühan, Ümit, Muhammed veya Taner)
- date: YYYY-MM-DD
- donem: "am", "pm" veya "tam"
- kind: "teslimat" (eğitim/danışmanlık/seyahat) veya "blok" (izin/meşguliyet)
- title: müşteri ve program, mümkünse "Müşteri | Program" formatında

Örnek:
[
  {"trainer":"Sühan","date":"2025-09-03","slot":"tam","kind":"teslimat","title":"Vakıf Katılım | Satış"},
  {"trainer":"Sühan","date":"2025-09-05","slot":"am","kind":"blok","title":"İzin"}
]`;
}

function extractJsonArray(text: string): VisionExtractedRow[] {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const candidate = fenced?.[1] ?? text;
  const start = candidate.indexOf("[");
  const end = candidate.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("Görselden yapılandırılmış veri çıkarılamadı");
  }

  const parsed = JSON.parse(candidate.slice(start, end + 1));
  if (!Array.isArray(parsed)) {
    throw new Error("Beklenen JSON dizisi bulunamadı");
  }

  return parsed as VisionExtractedRow[];
}

export function visionRowsToCsv(rows: VisionExtractedRow[]): string {
  const header = "egitmen,tarih,donem,tur,baslik";
  const lines = rows.map((row) => {
    const kind =
      row.kind === "delivery" || row.kind === "teslimat" ? "teslimat" : "blok";
    const title = row.title.includes(",") ? `"${row.title}"` : row.title;
    return `${row.trainer},${row.date},${row.slot},${kind},${title}`;
  });
  return [header, ...lines].join("\n");
}

export async function extractScheduleFromImage(
  imageBase64: string,
  mimeType: string,
  trainerHint?: string,
): Promise<VisionExtractedRow[]> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Resim okuma için OPENAI_API_KEY gerekli. .env.local dosyasına ekleyin.",
    );
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      temperature: 0,
      messages: [
        {
          role: "user",
          content: [
            { type: "text", text: buildPrompt(trainerHint) },
            {
              type: "image_url",
              image_url: {
                url: `data:${mimeType};base64,${imageBase64}`,
              },
            },
          ],
        },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Vision API hatası: ${body}`);
  }

  const data = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

  const content = data.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("Vision API boş yanıt döndü");
  }

  return extractJsonArray(content);
}
