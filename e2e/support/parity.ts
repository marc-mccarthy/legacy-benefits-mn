import type { Page } from "@playwright/test";

export async function bandsWithoutVisibleText(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const hasVisibleText = (root: Element): boolean =>
      [...root.querySelectorAll("*")].some((el) => {
        const own = [...el.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim().length > 0,
        );
        if (!own) return false;
        const style = getComputedStyle(el);
        if (style.visibility !== "visible" || style.display === "none")
          return false;
        if (style.color === "rgba(0, 0, 0, 0)" || style.color === "transparent")
          return false;
        let opacity = 1;
        for (let node: Element | null = el; node; node = node.parentElement)
          opacity *= Number(getComputedStyle(node).opacity);
        if (opacity !== 1) return false;
        const rect = el.getBoundingClientRect();
        return rect.width > 0 && rect.height > 0;
      });

    const bands = [...document.querySelectorAll("[data-band]")];
    const roots = bands.length ? bands : [document.querySelector("main")!];
    return roots
      .filter((root) => !hasVisibleText(root))
      .map((root) => `${root.tagName.toLowerCase()}#${root.id}`);
  });
}

export async function sweepAndSettle(page: Page): Promise<void> {
  await page.waitForLoadState("networkidle");
  const { step, max } = await page.evaluate(() => ({
    step: window.innerHeight / 2,
    max: document.documentElement.scrollHeight,
  }));
  const scrollTo = async (y: number) => {
    await page.evaluate((top) => window.scrollTo(0, top), y);
    await page.waitForTimeout(100);
  };
  for (let y = 0; y < max; y += step) await scrollTo(y);
  for (let y = max; y > 0; y -= step) await scrollTo(y);
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(3000);
}
