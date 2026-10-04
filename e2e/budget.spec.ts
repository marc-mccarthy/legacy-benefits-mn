import fs from "node:fs";
import path from "node:path";
import zlib from "node:zlib";
import { type Page, type Response, expect, test } from "@playwright/test";
import { ROUTES } from "./support/routes";

const EFFECT_MARKERS = ["WebGLRenderer", "data-three-stage", "acquireWebGL"];
const EFFECT_JS_BUDGET = 200 * 1024;
const FOLD_BUDGET = 1_572_864;
const MOBILE_VIDEO_BUDGET = 2 * 1024 * 1024;
const DESKTOP_LAZY_VIDEO_BUDGET = 8 * 1024 * 1024;
const LCP_BUDGET_MS = 2500;
const VIDEOS: Record<string, number> = {
  "mn-lake-dawn-dusk-mobile.mp4": MOBILE_VIDEO_BUDGET,
  "mn-blue-hour-loop.mp4": MOBILE_VIDEO_BUDGET,
  "signal-converge-loop-mobile.mp4": MOBILE_VIDEO_BUDGET,
  "mn-lake-desktop-scrub.mp4": DESKTOP_LAZY_VIDEO_BUDGET,
  "signal-converge-loop.mp4": DESKTOP_LAZY_VIDEO_BUDGET,
};

const gzipSize = (body: Buffer) => zlib.gzipSync(body).length;

async function effectScripts(
  responses: Response[],
  marker: string[] = EFFECT_MARKERS,
): Promise<{ url: string; gzip: number }[]> {
  const found: { url: string; gzip: number }[] = [];
  for (const response of responses) {
    if (response.request().resourceType() !== "script") continue;
    const body = await response.body();
    const text = body.toString("utf8");
    if (marker.some((needle) => text.includes(needle)))
      found.push({ url: response.url(), gzip: gzipSize(body) });
  }
  return found;
}

function collect(page: Page): Response[] {
  const responses: Response[] = [];
  page.on("response", (response) => responses.push(response));
  return responses;
}

test.describe("effect JavaScript", () => {
  for (const { path: route } of ROUTES) {
    if (route === "/") continue;
    test(`${route} downloads no WebGL renderer`, async ({ page }) => {
      const responses = collect(page);
      await page.goto(route);
      await page.waitForLoadState("networkidle");

      expect(await effectScripts(responses, ["WebGLRenderer"])).toEqual([]);
    });
  }

  test("/ stays within the effect budget and loads three after first paint", async ({
    page,
  }) => {
    const responses = collect(page);
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(1500);

    const scripts = await effectScripts(responses);
    const total = scripts.reduce((sum, script) => sum + script.gzip, 0);
    expect(total, JSON.stringify(scripts)).toBeLessThanOrEqual(
      EFFECT_JS_BUDGET,
    );

    const three = await effectScripts(responses, ["WebGLRenderer"]);
    expect(three.length).toBeGreaterThan(0);
    const timing = await page.evaluate(
      (urls) => {
        const paint = performance.getEntriesByName("first-contentful-paint")[0];
        return {
          fcp: paint?.startTime ?? Infinity,
          starts: urls.map(
            (url) =>
              performance.getEntriesByName(url)[0]?.startTime ?? -Infinity,
          ),
        };
      },
      three.map((script) => script.url),
    );
    for (const start of timing.starts) expect(start).toBeGreaterThanOrEqual(0);
    expect(Math.min(...timing.starts)).toBeGreaterThanOrEqual(timing.fcp);
  });
});

test("every mobile-autoplay video is at most 2 MB and every desktop-only lazy video at most 8 MB", () => {
  for (const [name, budget] of Object.entries(VIDEOS)) {
    const size = fs.statSync(path.join("public", "video", name)).size;
    expect(size, name).toBeLessThanOrEqual(budget);
  }
});

test("/ above the fold weighs at most 1.5 MB at 390x844", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const responses = collect(page);
  await page.goto("/", { waitUntil: "load" });
  await page.waitForTimeout(1000);

  let bytes = 0;
  for (const response of responses) {
    const type = response.request().resourceType();
    if (!["document", "stylesheet", "script", "font", "image"].includes(type))
      continue;
    const body = await response.body().catch(() => Buffer.alloc(0));
    bytes += ["font", "image"].includes(type) ? body.length : gzipSize(body);
  }

  expect(bytes).toBeLessThanOrEqual(FOLD_BUDGET);
});

test("/ paints its largest content within 2.5 s on a throttled phone", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile", "a phone-only budget");

  const samples: number[] = [];
  const elements: string[] = [];
  for (let run = 0; run < 3; run += 1) {
    const cdp = await page.context().newCDPSession(page);
    await cdp.send("Network.enable");
    await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
    await cdp.send("Network.emulateNetworkConditions", {
      offline: false,
      latency: 150,
      downloadThroughput: (1638 * 1024) / 8,
      uploadThroughput: (750 * 1024) / 8,
    });
    await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });

    await page.goto("/", { waitUntil: "load" });
    await page.waitForTimeout(1000);
    const lcp = await page.evaluate(
      () =>
        new Promise<{ time: number; element: string }>((resolve) => {
          new PerformanceObserver((list) => {
            const entry = list.getEntries().at(-1) as PerformanceEntry & {
              element: Element | null;
            };
            const element = entry.element;
            resolve({
              time: entry.startTime,
              element: element
                ? `${element.tagName}|${element.closest("[data-hero]") ? "hero" : "elsewhere"}`
                : "none",
            });
          }).observe({ type: "largest-contentful-paint", buffered: true });
        }),
    );
    samples.push(lcp.time);
    elements.push(lcp.element);
    await cdp.detach();
  }

  samples.sort((a, b) => a - b);
  expect(samples[1], JSON.stringify(samples)).toBeLessThanOrEqual(
    LCP_BUDGET_MS,
  );
  for (const element of elements)
    expect(["H1|hero", "P|hero", "IMG|hero"]).toContain(element);
});
