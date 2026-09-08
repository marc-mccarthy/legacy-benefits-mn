"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useCallback, useSyncExternalStore } from "react";
import { Container } from "@/components/ui/section";

/**
 * Thin bar above the header, in the pattern used on ethnocare.ca.
 *
 * For a Medicare practice the obvious use is the enrollment window, so the
 * bar is date-driven: set it once with a start and end date and it appears and
 * disappears on its own. Dismissal is remembered per message, so changing the
 * text shows it again to people who dismissed the previous one.
 */
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

  // Read the dismissal from localStorage as an external store rather than
  // syncing it into state from an effect, which would cascade a second render
  // on every page load.
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
    // Hidden during server render, so the bar never flashes for someone who
    // has already dismissed it.
    () => true,
  );

  if (dismissed) return null;

  return (
    <div data-scheme="dark" className="bg-surface text-on-surface">
      <Container className="flex items-center justify-center gap-4 py-2.5 text-sm">
        <p className="text-center">
          {text}
          {linkHref && linkLabel ? (
            <>
              {" "}
              <Link
                href={linkHref}
                className="font-semibold underline underline-offset-4"
              >
                {linkLabel}
              </Link>
            </>
          ) : null}
        </p>
        <button
          type="button"
          onClick={() => {
            window.localStorage.setItem(storageKey, "1");
            window.dispatchEvent(new Event("announcement-dismissed"));
          }}
          aria-label="Dismiss announcement"
          className="grid size-6 shrink-0 place-items-center rounded-full hover:bg-white/10"
        >
          <X aria-hidden className="size-4" />
        </button>
      </Container>
    </div>
  );
}
