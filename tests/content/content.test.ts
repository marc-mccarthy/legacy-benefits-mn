import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

import { articles } from "@/content/articles";
import { carriers } from "@/content/carriers";
import { events, upcomingEvents } from "@/content/events";
import { faq } from "@/content/faq";
import { homeBlocks } from "@/content/home";
import { media } from "@/content/media";
import { services } from "@/content/services";
import { site } from "@/content/site";
import { team } from "@/content/team";
import { testimonials } from "@/content/testimonials";

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
    expect(homeBlocks).toHaveLength(12);
  });

  it("carries the site settings children", () => {
    expect(site.nav).toHaveLength(5);
    expect(site.stats).toHaveLength(4);
    expect(site.compliance.stateLicenses).toHaveLength(3);
    expect(site.social).toHaveLength(0);
  });

  it("keeps the team licences the database held", () => {
    expect(team.map((member) => member.licenses.length)).toEqual([3]);
    expect(team[0]?.licenses).toContain("NPN 17742895");
  });

  it("shows the same NPN in the footer settings and the owner licences", () => {
    expect(site.compliance.npn).toBe("17742895");
    expect(team[0]?.licenses).toContain(`NPN ${site.compliance.npn}`);
  });

  it("gives Nate his CMIP registered credential", () => {
    expect(team[0]?.credential).toEqual({
      short: "CMIP®",
      full: "Certified Medicare Insurance Planner",
    });
  });

  it("states the licensed-since year and client count the same way everywhere", () => {
    const licensed = site.stats.find((stat) => stat.label === "Licensed since");
    const clients = site.stats.find((stat) => stat.label === "Clients served");

    expect(licensed).toEqual({
      value: 2015,
      suffix: "",
      label: "Licensed since",
      year: true,
    });
    expect(clients).toMatchObject({ value: 1400, suffix: "+" });
    expect(team[0]?.highlights).toEqual([
      "Licensed since 2015",
      "1,400+ clients served",
    ]);
    expect(team[0]?.bio).toContain("since 2015");
    expect(team[0]?.bio).not.toMatch(/eleven years/i);
  });

  it("orders the home blocks as the page authored them", () => {
    expect(homeBlocks.map((block) => block.blockType)).toEqual([
      "hero",
      "noise",
      "signal",
      "serviceGrid",
      "lake",
      "eventCarousel",
      "learningGrid",
      "testimonials",
      "stats",
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
        "band.loop",
        "close.starSprite",
        "env.studio",
        "learn.advantage-or-supplement",
        "learn.annual-enrollment-check",
        "learn.drug-cost-worksheet",
        "learn.enrollment-checklist",
        "learn.part-d-coverage-gaps",
        "learn.turning-65-timeline",
        "learn.when-can-i-change-my-plan",
        "events.image",
        "glass.medigap",
        "glass.partC",
        "glass.partD",
        "lake.dusk",
        "lake.loop",
        "lake.scrub",
        "lake.scrubPoster",
        "nate.cutout",
        "nate.chip",
        "nate.cutoutSample",
        "nate.duotone",
        "nate.withDaughter",
        "noise.card",
        "noise.envelope",
        "noise.folder",
        "noise.form",
        "noise.paper01",
        "noise.paper02",
        "noise.paper06",
        "noise.paper08",
        "noise.paper09",
        "noise.paper10",
        "noise.tornEnvelope",
        "pages.image",
        "services.image",
        "signal.loop",
        "signal.loopMobile",
        "signal.poster",
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

describe("article covers", () => {
  it("gives every article its own Learning Center cover", () => {
    for (const article of articles) {
      expect(article.coverImage, article.slug).toBe(
        media[`learn.${article.slug}`],
      );
    }
    const srcs = articles.map((article) => article.coverImage?.src);
    expect(new Set(srcs).size).toBe(articles.length);
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
