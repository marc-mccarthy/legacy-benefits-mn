"use client";

import { useCallback, useSyncExternalStore } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "consent-choice-v1";

type Choice = "granted" | "denied";

/**
 * Reads the visitor's stored choice as an external store rather than syncing
 * it into state from an effect, which would cause a cascading render on every
 * page load.
 */
function subscribe(onChange: () => void) {
  window.addEventListener("storage", onChange);
  window.addEventListener("consent-change", onChange);
  return () => {
    window.removeEventListener("storage", onChange);
    window.removeEventListener("consent-change", onChange);
  };
}

function getSnapshot(): Choice | null {
  // A Global Privacy Control signal is a legally binding opt-out under CPRA,
  // so it outranks (and pre-empts) any banner interaction.
  if (
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  ) {
    return "denied";
  }
  return window.localStorage.getItem(STORAGE_KEY) as Choice | null;
}

/** Server render has no storage and no GPC header available here. */
function getServerSnapshot(): Choice | null {
  return null;
}

function hasGpc(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

export function Analytics({ gtmId }: { gtmId?: string }) {
  const choice = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  const update = useCallback((value: Choice) => {
    window.localStorage.setItem(STORAGE_KEY, value);
    window.dispatchEvent(new Event("consent-change"));

    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }, []);

  const showBanner = choice === null && !hasGpc();

  return (
    <>
      {gtmId ? <GoogleTagManager gtmId={gtmId} /> : null}

      {showBanner ? (
        <div
          role="dialog"
          aria-label="Cookie choices"
          className="border-border-subtle bg-surface text-on-surface fixed inset-x-0 bottom-0 z-50 border-t p-5 shadow-lg"
        >
          <div className="mx-auto flex max-w-6xl flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <p className="text-sm leading-relaxed">
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
        </div>
      ) : null}
    </>
  );
}
