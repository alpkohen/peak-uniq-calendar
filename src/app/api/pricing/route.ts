import { NextResponse } from "next/server";
import { getSupabaseConfigError } from "@/lib/config";
import { formatErrorMessage } from "@/lib/errors";
import {
  getClientsWithPricing,
  upsertClientPricing,
  type PricingUpsertInput,
} from "@/lib/pricing";

export async function GET() {
  const configError = getSupabaseConfigError();
  if (configError) {
    return NextResponse.json({ error: configError }, { status: 500 });
  }

  try {
    const clients = await getClientsWithPricing();
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
    const body = (await request.json()) as PricingUpsertInput;
    const client = await upsertClientPricing(body);
    return NextResponse.json({ client });
  } catch (error) {
    return NextResponse.json(
      { error: formatErrorMessage(error) },
      { status: 500 },
    );
  }
}
