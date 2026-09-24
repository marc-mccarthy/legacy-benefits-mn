import { POST as doNotContact } from "./do-not-contact";
import { GET as health } from "./health";
import { POST as jobsOutbox } from "./jobs-outbox";
import { POST as leads } from "./leads";
import { POST as soa } from "./soa";

type FunctionUrlEvent = {
  rawPath?: string;
  rawQueryString?: string;
  headers?: Record<string, string | undefined>;
  cookies?: string[];
  body?: string;
  isBase64Encoded?: boolean;
  requestContext?: { http?: { method?: string; path?: string } };
};

type FunctionUrlResult = {
  statusCode: number;
  headers: Record<string, string>;
  body: string;
  isBase64Encoded: boolean;
};

type Handler = (req: Request) => Promise<Response>;

const ROUTES: Record<string, Record<string, Handler>> = {
  "/api/leads": { POST: leads },
  "/api/soa": { POST: soa },
  "/api/do-not-contact": { POST: doNotContact },
  "/api/jobs/outbox": { POST: jobsOutbox },
  "/api/health": { GET: health },
};

const NOT_FOUND = '{"error":"Not found"}';

/** Trailing slashes aside, the path is matched exactly — no prefix routing. */
function normalise(path: string): string {
  if (path.length > 1 && path.endsWith("/")) return path.slice(0, -1);
  return path;
}

export function toRequest(event: FunctionUrlEvent): Request {
  const method = event.requestContext?.http?.method ?? "GET";
  const path = normalise(
    event.rawPath ?? event.requestContext?.http?.path ?? "/",
  );
  const query = event.rawQueryString ? `?${event.rawQueryString}` : "";

  const headers = new Headers();
  for (const [key, value] of Object.entries(event.headers ?? {})) {
    if (value !== undefined) headers.set(key, value);
  }
  if (event.cookies?.length) headers.set("cookie", event.cookies.join("; "));

  const host = headers.get("host") ?? "localhost";
  const proto = headers.get("x-forwarded-proto") ?? "https";

  const body =
    event.body === undefined || method === "GET" || method === "HEAD"
      ? undefined
      : event.isBase64Encoded
        ? Buffer.from(event.body, "base64")
        : event.body;

  return new Request(`${proto}://${host}${path}${query}`, {
    method,
    headers,
    body,
  });
}

export async function toResult(response: Response): Promise<FunctionUrlResult> {
  const headers: Record<string, string> = {};
  response.headers.forEach((value, key) => {
    headers[key] = value;
  });

  return {
    statusCode: response.status,
    headers,
    body: await response.text(),
    isBase64Encoded: false,
  };
}

export async function handler(
  event: FunctionUrlEvent,
): Promise<FunctionUrlResult> {
  const method = (event.requestContext?.http?.method ?? "GET").toUpperCase();
  const path = normalise(
    event.rawPath ?? event.requestContext?.http?.path ?? "/",
  );

  const route = ROUTES[path]?.[method];
  if (!route) {
    return {
      statusCode: 404,
      headers: { "content-type": "application/json" },
      body: NOT_FOUND,
      isBase64Encoded: false,
    };
  }

  return toResult(await route(toRequest(event)));
}

export default handler;
