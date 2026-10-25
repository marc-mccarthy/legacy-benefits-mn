import { timingSafeEqual } from "crypto";

export function secretMatches(
  provided: string | null | undefined,
  expected: string,
): boolean {
  if (provided == null) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

function bearerToken(req: Request): string | undefined {
  const header = req.headers.get("authorization");
  return header?.startsWith("Bearer ") ? header.slice(7) : undefined;
}

export function bearerMatches(req: Request, expected: string): boolean {
  return secretMatches(bearerToken(req), expected);
}

export function headerOrBearerMatches(
  req: Request,
  headerName: string,
  expected: string,
): boolean {
  const provided = req.headers.get(headerName);
  return secretMatches(provided ?? bearerToken(req), expected);
}
