import { NextResponse } from "next/server";
import { importCsvText } from "@/lib/import-bookings";
import { buildScheduleCsv, scheduleSummary } from "@/lib/schedule-seed";
import { ensureDefaultTrainers } from "@/lib/trainers";

export async function POST() {
  try {
    await ensureDefaultTrainers();
    const csv = buildScheduleCsv();
    const result = await importCsvText(csv);
    const summary = scheduleSummary();

    return NextResponse.json({
      ok: result.imported > 0,
      ...result,
      summary,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message: unknown }).message)
          : "Schedule import failed";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
