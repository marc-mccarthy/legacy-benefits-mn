import { recordDncRequest } from "@/lib/compliance/dnc";
import { dncInputSchema } from "@/lib/compliance/dnc-schema";
import { clientIp } from "@/lib/security/request";

export async function POST(req: Request) {
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = dncInputSchema.safeParse(json);
  if (!parsed.success) {
    return Response.json(
      {
        error: "Validation failed",
        issues: parsed.error.flatten().fieldErrors,
      },
      { status: 422 },
    );
  }

  const { id } = await recordDncRequest(parsed.data, { ip: clientIp(req) });
  return Response.json({ ok: true, id }, { status: 201 });
}
