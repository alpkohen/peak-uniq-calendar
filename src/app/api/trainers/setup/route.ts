import { NextResponse } from "next/server";
import { ensureDefaultTrainers } from "@/lib/trainers";

export async function POST() {
  try {
    const result = await ensureDefaultTrainers();
    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : typeof error === "object" &&
            error !== null &&
            "message" in error
          ? String((error as { message: unknown }).message)
          : "Setup failed";

    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
