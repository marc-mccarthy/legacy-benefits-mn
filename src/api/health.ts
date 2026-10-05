import { sql } from "drizzle-orm";
import { db } from "@/lib/db";

export async function GET() {
  try {
    await db.execute(sql`SELECT 1`);
    return Response.json({ status: "ok", database: "up" });
  } catch {
    return Response.json(
      { status: "degraded", database: "down" },
      { status: 503 },
    );
  }
}
