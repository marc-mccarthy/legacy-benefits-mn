import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  join(__dirname, "..", "..", "src", "app", "globals.css"),
  "utf8",
);

const PRIMITIVES: Record<string, string> = {
  "ground-dark": "#081a3a",
  "ground-black": "#000000",
  "ground-light": "#f7f9fa",
  "ink-dark": "#ffffff",
  "ink-light": "#0a1128",
  "muted-dark": "#a0a8c0",
  "muted-light": "#5a6482",
  "unlit-dark": "#848ca6",
  "signal-cyan": "#00e0e0",
  "signal-cyan-ink": "#007a7a",
  "star-gold": "#ffc000",
  "star-gold-ink": "#996600",
};

function primitive(name: string): string {
  const m = css.match(new RegExp(`--color-${name}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!m) throw new Error(`missing primitive --color-${name}`);
  return m[1].toLowerCase();
}

function resolve(value: string): string {
  const hex = value.match(/^#[0-9a-fA-F]{6}$/);
  if (hex) return value.toLowerCase();
  const ref = value.match(/^var\(--color-([a-z-]+)\)$/);
  if (!ref) throw new Error(`cannot resolve ${value}`);
  return primitive(ref[1]);
}

function schemeVars(selector: string): Record<string, string> {
  const start = css.indexOf(selector);
  if (start < 0) throw new Error(`missing ${selector}`);
  const body = css.slice(css.indexOf("{", start) + 1, css.indexOf("}", start));
  const out: Record<string, string> = {};
  for (const m of body.matchAll(/--scheme-([a-z-]+):\s*([^;]+);/g)) {
    out[m[1]] = m[2].trim();
  }
  return out;
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

describe("palette tokens", () => {
  it.each(Object.entries(PRIMITIVES))("defines --color-%s as %s", (n, hex) => {
    expect(primitive(n)).toBe(hex);
  });

  it("carries no ethnocare colour", () => {
    for (const hex of ["#00f5f3", "#020b44", "#98bcce"]) {
      expect(css.toLowerCase()).not.toContain(hex);
    }
  });

  it("declares a black scheme", () => {
    expect(css).toContain('[data-scheme="black"]');
  });
});

describe("scheme contrast", () => {
  const schemes = ["light", "muted", "dark", "black"];

  it.each(schemes)("%s scheme meets WCAG AA", (name) => {
    const v = schemeVars(`[data-scheme="${name}"]`);
    const c = (k: string) => resolve(v[k]);
    const pairs: [string, number][] = [
      ["on-surface/surface", contrast(c("on-surface"), c("surface"))],
      ["muted/surface", contrast(c("muted"), c("surface"))],
      ["unlit/surface", contrast(c("unlit"), c("surface"))],
      ["accent/surface", contrast(c("accent"), c("surface"))],
      ["on-action/action", contrast(c("on-action"), c("action"))],
    ];
    for (const [label, ratio] of pairs) {
      expect(ratio, `${name} ${label}`).toBeGreaterThanOrEqual(4.5);
    }
  });
});

describe("film grain", () => {
  const rule = (selector: string, from = 0) => {
    const start = css.indexOf(`${selector} {`, from);
    if (start < 0) throw new Error(`missing ${selector}`);
    return css.slice(start, css.indexOf("}", start));
  };

  it("blends as an overlay at a visible strength", () => {
    const grain = rule("body::after");
    expect(grain).toContain("mix-blend-mode: overlay;");
    const opacity = Number(grain.match(/opacity:\s*([\d.]+);/)?.[1]);
    expect(opacity).toBeGreaterThanOrEqual(0.08);
    expect(opacity).toBeLessThanOrEqual(0.12);
  });

  it("is removed in print", () => {
    const grain = rule("body::after", css.indexOf("body::after {") + 1);
    expect(grain).toContain("display: none;");
  });
});
