"use client";

import { useCallback, useSyncExternalStore } from "react";
import { GoogleTagManager } from "@next/third-parties/google";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "consent-choice-v1";

type Choice = "granted" | "denied";

/** `undefined` is "not known yet" — the server render, before hydration. */
type Snapshot = Choice | null | undefined;

/**
 * Fallback for when storage is unavailable: Safari private mode throws on
 * `setItem`, and hardened profiles block it outright. Without this the choice
 * would be recorded nowhere, the next snapshot would read `null` again, and the
 * banner would reappear the instant it was dismissed.
 */
let memoryChoice: Choice | null = null;

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

function hasGpc(): boolean {
  return (
    typeof navigator !== "undefined" &&
    (navigator as Navigator & { globalPrivacyControl?: boolean })
      .globalPrivacyControl === true
  );
}

function getSnapshot(): Snapshot {
  // A Global Privacy Control signal is a legally binding opt-out under CPRA,
  // so it outranks (and pre-empts) any banner interaction.
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

/**
 * The server knows neither input: `localStorage` does not exist there, and the
 * Sec-GPC header is not plumbed through to this component. So it renders
 * nothing, and the banner appears after hydration.
 *
 * This is load-bearing, not a nicety. Returning `null` here — "no choice made"
 * — put the banner in the server HTML for every visitor, including everyone who
 * had already answered and everyone sending GPC. React then dropped it from the
 * client tree and left the server's markup orphaned in the DOM: a banner that
 * looks entirely normal, sits at full opacity above everything else, and has no
 * event handlers attached, so neither button does anything. It was not a
 * z-index or pointer-events problem, which is what a dead button usually is.
 *
 * Rendering nothing on the server means there is no orphan to leave behind.
 */
function getServerSnapshot(): Snapshot {
  return undefined;
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
    } catch {
      // The choice cannot be remembered across page loads, but it still has to
      // take effect for this one. memoryChoice above covers that.
    }
    window.dispatchEvent(new Event("consent-change"));

    const w = window as Window & { gtag?: (...args: unknown[]) => void };
    w.gtag?.("consent", "update", {
      ad_storage: value,
      ad_user_data: value,
      ad_personalization: value,
      analytics_storage: value,
    });
  }, []);

  // `undefined` is the pre-hydration state and deliberately shows nothing: only
  // a hydrated client that has actually read storage and GPC can decide. GPC is
  // already folded into the snapshot as "denied", so it needs no second test.
  //
  // With JavaScript off the banner therefore never appears — which is correct
  // rather than a gap, because the tag manager never loads either, so no
  // analytics cookie is ever set and there is nothing to consent to.
  const showBanner = choice === null;

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
            <p className="leading-relaxed">
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
