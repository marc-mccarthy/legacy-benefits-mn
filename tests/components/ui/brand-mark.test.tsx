import { readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { BrandLockup, BrandLogo } from "@/components/ui/brand-mark";

const iconSvg = readFileSync("src/app/icon.svg", "utf8");
const sprite = readFileSync("public/media/logo/lbg-sprite.svg", "utf8");

test("BrandLockup gives screen readers the business name as text and hides the drawn logo", () => {
  const html = renderToStaticMarkup(<BrandLockup name="CI Test Agency" />);

  expect(html).toContain("data-brand-lockup");
  expect(html).toContain('<span class="sr-only">CI Test Agency</span>');
  expect(html).not.toContain("<img");
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-mark/);
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-wordmark/);
});

test("BrandLockup draws the trees icon and the LEGACY wordmark from the sprite", () => {
  const html = renderToStaticMarkup(
    <BrandLockup name="Legacy Benefits Group" />,
  );

  expect(html).toContain('href="/media/logo/lbg-sprite.svg#trees"');
  expect(html).toContain('href="/media/logo/lbg-sprite.svg#wordmark"');
});

test("BrandLogo draws the full logo with the arc in the gold token", () => {
  const html = renderToStaticMarkup(<BrandLogo name="Legacy Benefits Group" />);

  expect(html).toContain("data-brand-lockup");
  expect(html).toContain('<span class="sr-only">Legacy Benefits Group</span>');
  expect(html).toMatch(/<svg[^>]*aria-hidden="true"[^>]*data-brand-logo/);
  expect(html).toContain('href="/media/logo/lbg-sprite.svg#full"');
  expect(html).toMatch(
    /<use href="\/media\/logo\/lbg-sprite.svg#full-arc"[^>]*class="text-star-gold"/,
  );
});

test("the sprite holds every symbol the components use, filled with currentColor", () => {
  for (const id of ["trees", "wordmark", "full", "full-arc"]) {
    expect(sprite).toContain(`<symbol id="${id}"`);
  }
  expect(sprite).toContain('fill="currentColor"');
  expect(sprite).not.toMatch(/<text|<image|<style/);
});

test("icon.svg is the white trees on the #081A3A tile", () => {
  expect(iconSvg).toMatch(/<rect [^>]*fill="#081A3A"\/>/);
  expect(iconSvg).toContain('<g fill="#FFFFFF"');
  expect(iconSvg).not.toContain("currentColor");
  expect(iconSvg).not.toMatch(/#020b44/i);
});
