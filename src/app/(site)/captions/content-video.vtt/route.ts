import { captionsToWebVtt } from "@/components/video/content-video";

export const runtime = "nodejs";
export const dynamic = "force-static";

export function GET() {
  return new Response(captionsToWebVtt(), {
    headers: { "content-type": "text/vtt; charset=utf-8" },
  });
}
