"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export function AnnouncementBar({
  text,
  linkLabel,
  linkHref,
}: {
  text: string;
  linkLabel?: string | null;
  linkHref?: string | null;
}) {
  const storageKey = `announcement-dismissed:${text}`;

  const subscribe = useCallback((onChange: () => void) => {
    window.addEventListener("storage", onChange);
    window.addEventListener("announcement-dismissed", onChange);
    return () => {
      window.removeEventListener("storage", onChange);
      window.removeEventListener("announcement-dismissed", onChange);
    };
  }, []);

  const dismissed = useSyncExternalStore(
    subscribe,
    () => window.localStorage.getItem(storageKey) === "1",
    () => false,
  );

  if (dismissed) return null;

  return (
    <div data-scheme="dark" className="bg-surface text-on-surface">
      <Container className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 py-1">
        <p className="text-center">{text}</p>
        {linkHref && linkLabel ? (
          <Button asChild variant="ghost" size="sm">
            <Link href={linkHref}>{linkLabel}</Link>
          </Button>
        ) : null}
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            window.localStorage.setItem(storageKey, "1");
            window.dispatchEvent(new Event("announcement-dismissed"));
          }}
          aria-label="Dismiss announcement"
          className="w-11 shrink-0 rounded-full px-0 no-underline hover:bg-white/10"
        >
          <X aria-hidden className="size-4" />
        </Button>
      </Container>
    </div>
  );
}
