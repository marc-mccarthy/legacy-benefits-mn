import { recordSoa } from "@/lib/compliance/soa";
import { soaInputSchema } from "@/lib/compliance/soa-schema";
import { verifyTurnstile } from "@/lib/security/turnstile";
import { clientIp } from "@/lib/security/request";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const body = json as Record<string, unknown>;
  const parsed = soaInputSchema.safeParse(body);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const ip = clientIp(req);
  if (!(await verifyTurnstile(body.turnstileToken as string | undefined, ip))) {
    return Response.json(
      { error: "Could not verify that you are human. Please try again." },
      { status: 403 },
    );
  }

  const result = await recordSoa(parsed.data, {
    ip,
    userAgent: req.headers.get("user-agent") ?? undefined,
  });

  return Response.json(
    {
      ok: true,
      id: result.id,
      signedAt: result.signedAt.toISOString(),
      meetsFortyEightHourGuidance: result.meetsFortyEightHourGuidance,
    },
    { status: 201 },
  );
}
