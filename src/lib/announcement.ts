export function announcementIsLive(a?: {
  enabled?: boolean | null;
  text?: string | null;
  startsAt?: string | null;
  endsAt?: string | null;
}): boolean {
  if (!a?.enabled || !a.text) return false;
  const now = Date.now();
  if (a.startsAt && now < new Date(a.startsAt).getTime()) return false;
  if (a.endsAt && now > new Date(a.endsAt).getTime() + 86_400_000) return false;
  return true;
}
