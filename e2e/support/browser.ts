import type { Page } from "@playwright/test";

/**
 * Shared browser-side helpers for the acceptance suite.
 *
 * Everything here exists because a plainer version of the same assertion was
 * found to pass over a feature that was not there. Each function records which
 * one.
 */

/**
 * The stylesheet the page actually loaded, concatenated.
 *
 * Reading a rule out of `src/app/globals.css` proves it was written. It does
 * not prove it shipped: Tailwind v4 minifies through Lightning CSS, and a
 * pseudo-element that build does not recognise is dropped with no error and no
 * warning. A view-transition rule that never reached the browser looks
 * identical to one that did, from every angle except the one where you look at
 * the served CSS — and it looks *completely* correct with motion enabled,
 * because the browser's own defaults do something plausible.
 *
 * `document.styleSheets[].cssRules` is deliberately not used: the CSSOM drops
 * rules it cannot parse, so reading it back would hide exactly the failure
 * this is looking for. The bytes are fetched instead.
 */
export async function builtCss(page: Page): Promise<string> {
  const hrefs = await page.evaluate(() =>
    [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
      .map((link) => link.href)
      .filter(Boolean),
  );

  const inline = await page.evaluate(() =>
    [...document.querySelectorAll("style")]
      .map((node) => node.textContent ?? "")
      .join("\n"),
  );

  const fetched: string[] = [];
  for (const href of hrefs) {
    const response = await page.request.get(href);
    fetched.push(await response.text());
  }

  return [inline, ...fetched].join("\n");
}

/** One animation running on a view-transition pseudo-element. */
export type PseudoAnimation = {
  pseudo: string;
  name: string;
  durationMs: number;
  delayMs: number;
};

type TransitionProbe = {
  calls: number;
  snapshots: PseudoAnimation[][];
};

declare global {
  interface Window {
    __lbmnViewTransitionProbe?: TransitionProbe;
  }
}

/**
 * Wrap `document.startViewTransition` before any application code runs, and
 * record what is animating at the moment the transition is ready to play.
 *
 * Two separate things are being caught here.
 *
 * The first is that **a transition may never start at all**. Every criterion
 * written about `::view-transition-*` is satisfied when no transition runs:
 * the pseudo-element tree only exists while one is in flight, so "the header's
 * group does not animate" and "the durations are zero" are both true of a site
 * that has no page transitions whatsoever. Counting the calls is what
 * distinguishes the two.
 *
 * The second is *when* to look. These pseudo-elements exist for a few hundred
 * milliseconds and cannot be read with `getComputedStyle`, because nothing in
 * the document tree addresses them. `transition.ready` is the one instant at
 * which the browser has built the pseudo-element tree and started the
 * animations but has not finished them, so `document.getAnimations()` returns
 * the real, resolved timings — including the ones the user agent supplies
 * itself when the stylesheet says nothing.
 */
export async function recordViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: TransitionProbe = { calls: 0, snapshots: [] };
    window.__lbmnViewTransitionProbe = probe;

    // Bound rather than called through the document, so the wrapper below can
    // be written to the native signature. `startViewTransition` is declared in
    // the DOM lib this project compiles against — confirmed by the typecheck,
    // which rejected a hand-written shim for it — so no cast is involved and a
    // change to the API's shape is a compile error rather than a silent no-op
    // at run time.
    const original = document.startViewTransition?.bind(document);
    if (typeof original !== "function") return;

    const snapshot = (): PseudoAnimation[] =>
      document
        .getAnimations()
        .map((animation) => {
          const effect = animation.effect as KeyframeEffect | null;
          const pseudo = effect?.pseudoElement ?? "";
          const timing = effect?.getComputedTiming();
          return {
            pseudo,
            name:
              (animation as Animation & { animationName?: string })
                .animationName ?? "",
            durationMs:
              typeof timing?.duration === "number" ? timing.duration : 0,
            delayMs: timing?.delay ?? 0,
          };
        })
        .filter((entry) => entry.pseudo.startsWith("::view-transition"));

    document.startViewTransition = (
      callbackOptions?:
        ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ): ViewTransition => {
      const transition = original(callbackOptions);
      probe.calls += 1;
      void transition.ready
        .then(() => {
          probe.snapshots.push(snapshot());
        })
        .catch(() => {
          // A transition skipped by the browser resolves `ready` as a
          // rejection. Recording nothing is correct: there were no animations
          // to observe. The call count above still registers the attempt.
          probe.snapshots.push([]);
        });
      return transition;
    };
  });
}

/** How many view transitions the page has started since it loaded. */
export async function transitionCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__lbmnViewTransitionProbe?.calls ?? 0);
}

/**
 * The animations that were running on view-transition pseudo-elements at
 * `transition.ready`, for the most recent transition.
 */
export async function lastTransitionAnimations(
  page: Page,
): Promise<PseudoAnimation[]> {
  await page.waitForFunction(
    () => (window.__lbmnViewTransitionProbe?.snapshots.length ?? 0) > 0,
    undefined,
    { timeout: 10_000 },
  );
  return page.evaluate(() => {
    const snapshots = window.__lbmnViewTransitionProbe?.snapshots ?? [];
    return snapshots[snapshots.length - 1] ?? [];
  });
}

/**
 * Every element that renders text of its own, with its computed size.
 *
 * "Of its own" is the load-bearing part: an ancestor inherits nothing useful
 * for a type-size audit, because a `div` wrapping a paragraph reports the
 * paragraph's font size whether or not the `div` renders a character. Walking
 * direct text children instead measures the element that actually paints the
 * glyphs, which is the element a reader complains about.
 */
export async function textSizes(
  page: Page,
  excludeSelector: string,
): Promise<{ tag: string; size: number; text: string; path: string }[]> {
  return page.evaluate((exclude) => {
    const describe = (el: Element): string => {
      const parts: string[] = [];
      let node: Element | null = el;
      while (node && parts.length < 4) {
        const id = node.id ? `#${node.id}` : "";
        parts.unshift(`${node.tagName.toLowerCase()}${id}`);
        node = node.parentElement;
      }
      return parts.join(">");
    };

    return [...document.querySelectorAll<HTMLElement>("body *")]
      .filter((el) => {
        if (exclude && el.closest(exclude)) return false;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden")
          return false;
        // A screen-reader-only element is clipped to a 1px box on purpose and
        // is never read with the eyes; measuring its type size would report a
        // failure nobody can see and hide the ones they can.
        if (el.getBoundingClientRect().width <= 1) return false;
        return [...el.childNodes].some(
          (child) =>
            child.nodeType === Node.TEXT_NODE &&
            (child.textContent ?? "").trim().length > 0,
        );
      })
      .map((el) => ({
        tag: el.tagName.toLowerCase(),
        size: parseFloat(getComputedStyle(el).fontSize),
        text: (el.textContent ?? "").trim().slice(0, 50),
        path: describe(el),
      }));
  }, excludeSelector);
}
