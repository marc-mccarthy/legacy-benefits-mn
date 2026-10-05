"use client";

import { useCallback, useSyncExternalStore } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "consent-choice-v1";

type Choice = "granted" | "denied";

type Snapshot = Choice | null | undefined;

let memoryChoice: Choice | null = null;

function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("consent-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("consent-change", onChange);
  };
}

function hasGpc(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

function getSnapshot(): Snapshot {
  if (hasGpc()) return "denied";
  try {
    return (
      (window.localStorage.getItem(STORAGE_KEY) as Choice | null) ??
      memoryChoice
    );
  } catch {
    return memoryChoice;
  }
}

function getServerSnapshot(): Snapshot {
  return undefined;
}

function reserveStripSpace(strip: HTMLDivElement | null) {
  if (!strip) return;
  const root = document.documentElement;
  const observer = new ResizeObserver(() => {
    root.style.setProperty("--consent-h", `${strip.offsetHeight}px`);
  });
  root.setAttribute("data-consent-open", "");
  observer.observe(strip);
  return () => {
    observer.disconnect();
    root.removeAttribute("data-consent-open");
    root.style.removeProperty("--consent-h");
  };
}

export function Analytics({ gtmId }: { gtmId?: string }) {
  const choice = useSyncExternalStore<Snapshot>(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const update = useCallback((value: Choice) => {
    memoryChoice = value;
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {}
    window.dispatchEvent(new Event("consent-change"));

    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }, []);

  const showBanner = choice === null;

  return (
    <>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}

      {showBanner ? (
        <div
          ref={reserveStripSpace}
          role="dialog"
          aria-label="Cookie choices"
          className="border-border-subtle bg-surface text-on-surface fixed inset-x-0 bottom-0 z-50 flex flex-col gap-3 border-t px-5 py-3 shadow-(--shadow-lifted) sm:flex-row sm:items-center sm:justify-between print:hidden"
        >
          <p className="text-base leading-snug">
            We use cookies to understand how this site is used. We do not sell
            your personal information. See our{" "}
            <a href="/privacy" className="underline underline-offset-4">
              privacy policy
            </a>
            .
          </p>
          <div className="flex shrink-0 gap-3">
            <Button
              size="sm"
              variant="secondary"
              onClick={() => update("denied")}
            >
              Reject
            </Button>
            <Button size="sm" onClick={() => update("granted")}>
              Accept
            </Button>
          </div>
        </div>
      ) : null}
    </>
  );
}
