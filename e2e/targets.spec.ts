import { expect, test } from "@playwright/test";

const MIN = 44;

test("/ has tap targets of at least 44x44 at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await page.waitForLoadState("networkidle");

  const small = await page.evaluate((min) => {
    const size = (el: Element) => {
      const rect = el.getBoundingClientRect();
      return { w: rect.width, h: rect.height };
    };
    const inText = (el: Element) => {
      if (el.tagName !== "A") return false;
      const block = el.closest("p, li, dd, blockquote");
      return (
        !!block &&
        [...block.childNodes].some(
          (node) =>
            node.nodeType === Node.TEXT_NODE &&
            (node.textContent ?? "").trim().length > 0,
        )
      );
    };
    return [
      ...document.querySelectorAll(
        'a, button, input, select, textarea, [role="button"]',
      ),
    ]
      .filter((el) => {
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden")
          return false;
        if (el instanceof HTMLInputElement && el.type === "hidden")
          return false;
        if (el.closest(".sr-only") || inText(el)) return false;
        const rect = size(el);
        if (rect.w === 0 && rect.h === 0) return false;
        const label =
          el instanceof HTMLInputElement ||
          el instanceof HTMLSelectElement ||
          el instanceof HTMLTextAreaElement
            ? el.labels?.[0]
            : null;
        const own = size(el);
        const wide = label ? size(label) : own;
        const w = Math.max(own.w, wide.w);
        const h = Math.max(own.h, wide.h);
        return w < min - 0.5 || h < min - 0.5;
      })
      .map((el) => {
        const rect = size(el);
        return `${el.tagName.toLowerCase()} "${(el.textContent ?? el.getAttribute("aria-label") ?? "").trim().slice(0, 30)}" ${Math.round(rect.w)}x${Math.round(rect.h)}`;
      });
  }, MIN);

  expect(small).toEqual([]);
});
