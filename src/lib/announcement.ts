/**
 * Whether today falls inside the announcement's configured window.
 *
 * Kept out of the client component so the server layout can call it directly
 * — a function exported from a "use client" module cannot be invoked on the
 * server, only rendered.
 */
export function announcementIsLive(a?: {
  enabled?: boolean | null;
  text?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): boolean {
  if (!a?.enabled || !a.text) return false;
  const now = Date.now();
  if (a.startsAt && now < new Date(a.startsAt).getTime()) return false;
  // Compare against the end of the closing day, not midnight at its start.
  if (a.endsAt && now > new Date(a.endsAt).getTime() + 86_400_000) return false;
  return true;
}
