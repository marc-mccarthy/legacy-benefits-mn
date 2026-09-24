"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { announcementIsLive } from "@/lib/announcement";

type Announcement = Parameters<typeof announcementIsLive>[0];

const noSubscription = () => () => {};

/**
 * Re-checks the announcement window in the browser.
 *
 * The bar is decided at build time on a static site, so a window that closes
 * between one deploy and the next would leave a stale bar on the page. The
 * server snapshot is `true` — the layout only renders this when the window was
 * open at build time — and the client snapshot re-evaluates it, which is how
 * the two are allowed to disagree without a hydration mismatch.
 */
export function AnnouncementLive({
  announcement,
  children,
}: {
  announcement: Announcement;
  children: ReactNode;
}) {
  const live = useSyncExternalStore(
    noSubscription,
    () => announcementIsLive(announcement),
    () => true,
  );

  if (!live) return null;
  return <>{children}</>;
}
