import { NextResponse } from "next/server";
import { recordDncRequest } from "@/lib/compliance/dnc";
import { dncInputSchema } from "@/lib/compliance/dnc-schema";
import { clientIp } from "@/lib/security/request";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Opt-out intake. No Turnstile and no identity check by design — a stop
 * request must be easy to make. The cost of an unnecessary suppression is a
 * lost lead; the cost of a missed one is a TCPA claim.
 */
export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dncInputSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { id } = await recordDncRequest(parsed.data, { ip: clientIp(req) });
  return NextResponse.json({ ok: true, id }, { status: 201 });
}
