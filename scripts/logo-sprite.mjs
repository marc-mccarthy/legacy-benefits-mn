#!/usr/bin/env node
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const source = join(root, "brand", "logo");
const sprite = join(root, "public", "media", "logo", "lbg-sprite.svg");
const icon = join(root, "src", "app", "icon.svg");
const TAGLINE_GAP = 150;
const ICON_NAVY = "#081A3A";

const layout = JSON.parse(
  readFileSync(join(source, "lbg-layout.json"), "utf8"),
);

function piece(file) {
  const svg = readFileSync(join(source, file), "utf8");
  const viewBox = svg.match(/viewBox="([^"]+)"/)?.[1];
  const paths = svg.match(/<path[^>]*\/>|<path[^>]*>[\s\S]*?<\/path>/g);
  if (!viewBox || !paths) {
    console.error(`❌ logo-sprite: ${file} has no viewBox or paths`);
    process.exit(1);
  }
  const [, , w, h] = viewBox.split(/\s+/).map(Number);
  return { ...layout[file], w, h, body: paths.join("") };
}

function placed(part, dy = 0) {
  return `<g transform="translate(${round(part.x)} ${round(part.y + dy)})">${part.body}</g>`;
}

function round(value) {
  return Math.round(value * 10) / 10;
}

function box(parts) {
  const x = Math.min(...parts.map((p) => p.x));
  const y = Math.min(...parts.map((p) => p.y));
  const right = Math.max(...parts.map((p) => p.x + p.w));
  const bottom = Math.max(...parts.map((p) => p.y + p.h));
  return [x, y, right - x, bottom - y].map(round).join(" ");
}

function symbol(id, viewBox, body) {
  return `<symbol id="${id}" viewBox="${viewBox}">${body}</symbol>`;
}

const trees = piece("lbg-trees.svg");
const treesOnly = piece("lbg-trees-only.svg");
const legacy = piece("lbg-legacy.svg");
const benefits = piece("lbg-benefits-group.svg");
const tagline = piece("lbg-tagline.svg");
const arc = piece("lbg-arc.svg");

const shift = benefits.y + benefits.h + TAGLINE_GAP - tagline.y;
const lifted = (part) => ({ ...part, y: part.y + shift });
const fullBox = box([trees, legacy, benefits, lifted(tagline), lifted(arc)]);

writeFileSync(
  sprite,
  `<svg xmlns="http://www.w3.org/2000/svg">${[
    symbol(
      "trees",
      `0 0 ${treesOnly.w} ${treesOnly.h}`,
      placed({ ...treesOnly, x: 0, y: 0 }),
    ),
    symbol(
      "wordmark",
      box([legacy, benefits]),
      placed(legacy) + placed(benefits),
    ),
    symbol(
      "full",
      fullBox,
      placed(trees) +
        placed(legacy) +
        placed(benefits) +
        placed(tagline, shift),
    ),
    symbol("full-arc", fullBox, placed(arc, shift)),
  ].join("")}</svg>\n`,
);

const pad = Math.max(treesOnly.w, treesOnly.h) * 0.16;
const side = Math.max(treesOnly.w, treesOnly.h) + pad * 2;
const tile = round(side);
writeFileSync(
  icon,
  `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${tile} ${tile}"><rect width="${tile}" height="${tile}" rx="${round(side * 0.22)}" fill="${ICON_NAVY}"/><g fill="#FFFFFF" transform="translate(${round((side - treesOnly.w) / 2)} ${round((side - treesOnly.h) / 2)})">${treesOnly.body.replaceAll('fill="currentColor"', "")}</g></svg>\n`,
);

console.log(`ℹ️ logo-sprite: wrote ${sprite} and ${icon}`);
