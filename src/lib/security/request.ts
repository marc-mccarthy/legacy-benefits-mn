/** First hop in X-Forwarded-For is the client when behind ALB + CloudFront. */
export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || undefined;
}

/**
 * Global Privacy Control. Under CPRA and several state laws a GPC signal is a
 * legally binding opt-out of sale/sharing, so it is honoured automatically
 * rather than requiring the visitor to also click a banner.
 */
export function hasGlobalPrivacyControl(req: Request): boolean {
  return req.headers.get("sec-gpc") === "1";
}
