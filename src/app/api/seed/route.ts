import { NextResponse } from "next/server";
import { seedIfEmpty } from "@/lib/data";
import { syncAllTrainers } from "@/lib/sync";

export async function POST() {
  try {
    const seedResult = await seedIfEmpty();
    const syncResults = await syncAllTrainers();
    return NextResponse.json({
      ok: true,
      seed: seedResult,
      sync: syncResults,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message: unknown }).message)
          : "Seed failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
