import { NextResponse } from "next/server";
import { getClients, getActiveTrainers } from "@/lib/data";
import { parseImportCsv } from "@/lib/import";
import { extractScheduleFromImage, visionRowsToCsv } from "@/lib/vision";

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const file = formData.get("image");
    const trainerHint =
      typeof formData.get("trainer") === "string"
        ? String(formData.get("trainer"))
        : undefined;

    if (!(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "Resim dosyası gerekli" },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { ok: false, error: "Sadece resim dosyaları desteklenir" },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const imageBase64 = buffer.toString("base64");
    const extracted = await extractScheduleFromImage(
      imageBase64,
      file.type,
      trainerHint,
    );

    if (extracted.length === 0) {
      return NextResponse.json({
        ok: false,
        error: "Görselde kayıt bulunamadı",
      });
    }

    const csv = visionRowsToCsv(extracted);
    const trainers = await getActiveTrainers();
    const clients = await getClients();
    const { rows, errors } = parseImportCsv(csv, trainers, clients);

    return NextResponse.json({
      ok: true,
      extracted,
      csv,
      previewCount: rows.length,
      errors,
      message: `${extracted.length} kayıt okundu, ${rows.length} satır doğrulandı`,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message: unknown }).message)
          : "Image import failed";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
