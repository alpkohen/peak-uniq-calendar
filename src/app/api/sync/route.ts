import { NextResponse } from "next/server";
import { syncAllTrainers } from "@/lib/sync";

export async function POST() {
  try {
    const results = await syncAllTrainers();
    return NextResponse.json({ ok: true, results });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Sync failed";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
