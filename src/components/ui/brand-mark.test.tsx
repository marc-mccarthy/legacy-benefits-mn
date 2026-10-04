import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { BrandLockup, BrandMark } from "./brand-mark";

const iconSvg = readFileSync("src/app/icon.svg", "utf8");

test("BrandLockup renders the name as text and an aria-hidden mark", () => {
  const html = renderToStaticMarkup(<BrandLockup name="Legacy Benefits" />);

  expect(html).toContain("data-brand-lockup");
  expect(html).toContain(">Legacy Benefits</span>");
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-mark/);
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
