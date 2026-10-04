import { events, eventBySlug } from "@/content/events";
import { getBusinessIdentity } from "@/lib/business";
import { eventToIcs } from "@/lib/ics";

export const dynamic = "force-static";
export const dynamicParams = false;

type Context = { params: Promise<{ slug: string }> };

const builtAt = new Date();

export function generateStaticParams() {
  return events.map((event) => ({ slug: event.slug }));
}

export async function GET(_request: Request, { params }: Context) {
  const { slug } = await params;
  const event = eventBySlug(slug);
  if (!event) return new Response("Not found", { status: 404 });
  const { name } = await getBusinessIdentity();
  return new Response(eventToIcs(event, name, builtAt), {
    headers: { "content-type": "text/calendar; charset=utf-8" },
  });
}
