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

type TransitionProbe = {
  calls: number;
};

declare global {
  interface Window {
    __lbmnViewTransitionProbe?: TransitionProbe;
  }
}

export async function recordViewTransitions(page: Page): Promise<void> {
  await page.addInitScript(() => {
    const probe: TransitionProbe = { calls: 0 };
    window.__lbmnViewTransitionProbe = probe;

    const original = document.startViewTransition?.bind(document);
    if (typeof original !== "function") return;

    document.startViewTransition = (
      callbackOptions?:
        ViewTransitionUpdateCallback | StartViewTransitionOptions,
    ): ViewTransition => {
      probe.calls += 1;
      return original(callbackOptions);
    };
  });
}

export async function transitionCount(page: Page): Promise<number> {
  return page.evaluate(() => window.__lbmnViewTransitionProbe?.calls ?? 0);
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
