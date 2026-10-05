"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { announcementIsLive } from "@/lib/announcement";

type Announcement = Parameters<typeof announcementIsLive>[0];

const noSubscription = () => () => {};

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
