/**
 * First hop in X-Forwarded-For is the client, behind CloudFront.
 *
 * The load balancer that used to sit between the edge and the app is gone, and
 * the semantics this split relies on did not change with it: each hop appends
 * to the right, so the leftmost entry is the address the edge saw.
 */
export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || undefined;
}

// A `sec-gpc: 1` header is treated as an opt-out on its own; callers do not
// wait for a banner interaction.
export function hasGlobalPrivacyControl(req: Request): boolean {
  return req.headers.get("sec-gpc") === "1";
}
