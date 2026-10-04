import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { BrandLockup, BrandMark } from "@/components/ui/brand-mark";

const iconSvg = readFileSync("src/app/icon.svg", "utf8");
const globalsCss = readFileSync("src/app/globals.css", "utf8");

test("BrandLockup renders the name as text and an aria-hidden mark", () => {
  const html = renderToStaticMarkup(<BrandLockup name="CI Test Agency" />);

  expect(html).toContain("data-brand-lockup");
  expect(html).toContain(">CI Test Agency</span>");
  expect(html).not.toContain("aria-label");
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-mark/);
});

test("BrandLockup replaces a leading L with the mark and keeps the full accessible name", () => {
  const html = renderToStaticMarkup(<BrandLockup name="Legacy Benefits" />);

  expect(html).toContain('aria-label="Legacy Benefits"');
  expect(html).toContain(">egacy Benefits</span>");
  expect(html).not.toContain(">Legacy Benefits<");
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-mark/);
  expect(html).toMatch(/data-star[^>]*fill="var\(--color-star-gold\)"/);
});

test("BrandLockup treats a lowercase leading l as the mark too", () => {
  const html = renderToStaticMarkup(<BrandLockup name="lakeside" />);

  expect(html).toContain(">akeside</span>");
});

test("BrandMark L uses currentColor and the star uses the gold token", () => {
  const html = renderToStaticMarkup(<BrandMark />);

  expect(html).toContain('stroke="currentColor"');
  expect(html).toMatch(/data-star[^>]*fill="var\(--color-star-gold\)"/);
});

test("neither BrandMark nor src/app/icon.svg contains #020B44", () => {
  const html = renderToStaticMarkup(<BrandMark />);

  expect(html).not.toMatch(/#020b44/i);
  expect(iconSvg).not.toMatch(/#020b44/i);
});

test("icon.svg tile is #081A3A", () => {
  expect(iconSvg).toContain(
    '<rect width="100" height="100" rx="22" fill="#081A3A"/>',
  );
});

test("globals.css prints the star in the gold ink", () => {
  expect(globalsCss).toMatch(
    /@media print[\s\S]*\[data-brand-mark\] \[data-star\]\s*\{\s*fill: var\(--color-star-gold-ink\);/,
  );
});

test("globals.css keeps the wordmark visible in the stuck phone header", () => {
  expect(globalsCss).not.toMatch(
    /\[data-brand-lockup\] > span\s*\{\s*@apply sr-only/,
  );
  expect(globalsCss).toMatch(
    /header\[data-site-header\]\[data-stuck\] \[data-brand-lockup\] \{\s*font-size: 0\.9375rem;/,
  );
});
