import { NextResponse } from "next/server";
import { getSupabaseConfigError } from "@/lib/config";
import { formatErrorMessage } from "@/lib/errors";
import {
  deleteHotClient,
  getHotClients,
  upsertHotClient,
  type HotUpsertInput,
} from "@/lib/hot";

export async function GET() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    const clients = await getHotClients();
    return NextResponse.json({ clients });
  } catch (error) {
    return NextResponse.json(
      { error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function PUT(request: Request) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    const body = (await request.json()) as HotUpsertInput;
    const client = await upsertHotClient(body);
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request) {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) {
      return NextResponse.json({ error: "id gerekli" }, { status: 400 });
    }
    await deleteHotClient(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
