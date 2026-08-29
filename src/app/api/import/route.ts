import { NextResponse } from "next/server";
import { importCsvText } from "@/lib/import-bookings";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const text = typeof body.csv === "string" ? body.csv : "";

    if (!text.trim()) {
      return NextResponse.json(
        { ok: false, error: "CSV içeriği boş" },
        { status: 400 },
      );
    }

    const result = await importCsvText(text);

    if (result.imported === 0) {
      return NextResponse.json({
        ok: false,
        imported: 0,
        errors: result.errors,
        message: result.message,
      });
    }

    return NextResponse.json({
      ok: true,
      imported: result.imported,
      errors: result.errors,
      message: result.message,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message: unknown }).message)
          : "Import failed";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
