import type { Page } from "@playwright/test";

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

export async function recordViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: TransitionProbe = { calls: 0, snapshots: [] };
    window.__lbmnViewTransitionProbe = probe;

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
          probe.snapshots.push([]);
        });
      return transition;
    };
  });
}

export async function transitionCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__lbmnViewTransitionProbe?.calls ?? 0);
}

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
