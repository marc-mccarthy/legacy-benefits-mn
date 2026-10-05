export function clientIp(req: Request): string | undefined {
  const fwd = req.headers.get("x-forwarded-for");
  return fwd?.split(",")[0]?.trim() || undefined;
}

export function hasGlobalPrivacyControl(req: Request): boolean {
  return req.headers.get("sec-gpc") === "1";
}
