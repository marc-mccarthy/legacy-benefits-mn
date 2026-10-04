import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { articles } from "./articles";
import { carriers } from "./carriers";
import { events, upcomingEvents } from "./events";
import { faq } from "./faq";
import { homeBlocks } from "./home";
import { media } from "./media";
import { services } from "./services";
import { site } from "./site";
import { team } from "./team";
import { testimonials } from "./testimonials";

const repoRoot = join(import.meta.dirname, "..", "..");
const publicPath = (src: string) =>
  join(repoRoot, "public", src.replace(/^\//, ""));

describe("row counts recorded in the spec's extraction table", () => {
  it("carries every row the database held", () => {
    expect(services).toHaveLength(3);
    expect(team).toHaveLength(1);
    expect(articles).toHaveLength(7);
    expect(events).toHaveLength(4);
    expect(testimonials).toHaveLength(3);
    expect(carriers).toHaveLength(6);
    expect(faq).toHaveLength(4);
    expect(homeBlocks).toHaveLength(10);
  });

  it("carries the site settings children", () => {
    expect(site.nav).toHaveLength(5);
    expect(site.stats).toHaveLength(4);
    expect(site.compliance.stateLicenses).toHaveLength(3);
    expect(site.social).toHaveLength(0);
  });

  it("keeps the team licences the database held", () => {
    expect(team.map((member) => member.licenses.length)).toEqual([3]);
    expect(team[0]?.licenses).toContain("NPN 19472086");
  });

  it("orders the home blocks as the page authored them", () => {
    expect(homeBlocks.map((block) => block.blockType)).toEqual([
      "hero",
      "noise",
      "serviceGrid",
      "stats",
      "eventCarousel",
      "testimonials",
      "learningGrid",
      "carrierStrip",
      "faq",
      "ctaBand",
    ]);
  });

  it("orders collections by their authored order", () => {
    expect(services.map((service) => service.order)).toEqual([1, 2, 3]);
    expect(team.map((member) => member.order)).toEqual([1]);
  });
});

describe("media slots", () => {
  it("exposes exactly the slots the manifest names", () => {
    expect(Object.keys(media).sort()).toEqual(
      [
        "articles.coverImage",
        "close.starSprite",
        "events.image",
        "nate.cutout",
        "nate.chip",
        "nate.cutoutSample",
        "nate.duotone",
        "noise.card",
        "noise.envelope",
        "noise.folder",
        "noise.form",
        "noise.tornEnvelope",
        "pages.image",
        "services.image",
        "team.owner",
      ].sort(),
    );
  });

  it("agrees with media-manifest.json on every src, dimension and alt", () => {
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "media-manifest.json"), "utf8"),
    ) as {
      assets: {
        slot: string;
        file: string;
        alt: string;
        intrinsic: { width: number; height: number };
        variants: { width: number; format: string; path: string }[];
      }[];
    };

    for (const asset of manifest.assets) {
      const entry = media[asset.slot];
      expect(entry, asset.slot).toBeDefined();
      expect(entry?.src).toBe(`/${asset.file.replace(/^public\//, "")}`);
      expect(entry?.width).toBe(asset.intrinsic.width);
      expect(entry?.height).toBe(asset.intrinsic.height);
      expect(entry?.alt).toBe(asset.alt);
      expect(entry?.srcSet).toHaveLength(asset.variants.length);
    }
  });

  it("points every src and every srcSet entry at a file on disk", () => {
    for (const [slot, asset] of Object.entries(media)) {
      expect(existsSync(publicPath(asset.src)), `${slot} ${asset.src}`).toBe(
        true,
      );
      for (const variant of asset.srcSet) {
        expect(
          existsSync(publicPath(variant.src)),
          `${slot} ${variant.src}`,
        ).toBe(true);
      }
    }
  });

  it("gives every asset a non-empty alt", () => {
    for (const [slot, asset] of Object.entries(media)) {
      expect(asset.alt.trim(), slot).not.toBe("");
    }
  });
});

describe("no two people share a photograph", () => {
  it("gives the team owner the team.owner media slot", () => {
    expect(team[0]?.photo).toBe(media["team.owner"]);
  });

  it("holds for the team", () => {
    const used = team
      .map((member) => member.photo)
      .filter((photo) => photo !== null);
    expect(new Set(used.map((photo) => photo.src)).size).toBe(used.length);
  });

  it("holds for the testimonials", () => {
    const used = testimonials
      .map((item) => item.photo)
      .filter((photo) => photo !== null);
    expect(new Set(used.map((photo) => photo.src)).size).toBe(used.length);
  });
});

describe("slugs", () => {
  it("are unique within each collection", () => {
    for (const list of [services, team, articles, events]) {
      const slugs = list.map((item) => item.slug);
      expect(new Set(slugs).size).toBe(slugs.length);
    }
  });

  it("match the routes the site publishes", () => {
    expect(services.map((s) => s.slug)).toEqual([
      "medicare-advantage",
      "medicare-supplement",
      "part-d",
    ]);
    expect(team.map((m) => m.slug)).toEqual(["owner"]);
    expect(events.map((e) => e.slug)).toEqual([
      "medicare-basics-workshop",
      "turning-65-this-year",
      "annual-enrollment-clinic",
      "medicare-and-travel",
    ]);
    expect(articles.map((a) => a.slug)).toEqual([
      "when-can-i-change-my-plan",
      "enrollment-checklist",
      "advantage-or-supplement",
      "part-d-coverage-gaps",
      "drug-cost-worksheet",
      "turning-65-timeline",
      "annual-enrollment-check",
    ]);
  });
});

describe("upcomingEvents", () => {
  it("keeps events whose start is at or after the given moment", () => {
    expect(upcomingEvents(new Date("2026-01-01T00:00:00.000Z"))).toHaveLength(
      4,
    );
    expect(upcomingEvents(new Date("2026-10-07T00:00:00.000Z"))).toHaveLength(
      2,
    );
    expect(upcomingEvents(new Date("2027-01-01T00:00:00.000Z"))).toHaveLength(
      0,
    );
  });

  it("returns them in chronological order", () => {
    const starts = upcomingEvents(new Date("2026-01-01T00:00:00.000Z")).map(
      (e) => new Date(e.startsAt).getTime(),
    );
    expect(starts).toEqual([...starts].sort((a, b) => a - b));
  });
});

describe("article bodies", () => {
  it("gives every article and service a body component", () => {
    for (const article of articles)
      expect(typeof article.Body).toBe("function");
    for (const service of services)
      expect(typeof service.Body).toBe("function");
  });
});
