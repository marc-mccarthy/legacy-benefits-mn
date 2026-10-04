// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { SignalPortrait } from "@/components/sections/signal-portrait";

const reducedMotion = vi.fn<() => boolean>(() => false);
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reducedMotion(),
}));

let observers: ((entries: IntersectionObserverEntry[]) => void)[] = [];
const play = vi.fn(async () => {});
const pause = vi.fn();

const props = {
  heading: "You talk to Nate. Every time.",
  ctaLabel: "Talk to Nate",
};

function setOnscreen(isIntersecting: boolean) {
  for (const callback of observers) {
    act(() => callback([{ isIntersecting } as IntersectionObserverEntry]));
  }
}

beforeEach(() => {
  observers = [];
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        observers.push(callback);
      }
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  }));
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  reducedMotion.mockReturnValue(false);
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  play.mockClear();
  pause.mockClear();
});

test("server render shows the beam poster behind the frame and no video", () => {
  const html = renderToString(<SignalPortrait {...props} />);
  expect(html).toContain("data-signal-beam-still");
  expect(html).toContain("signal-converge-loop-poster.jpg");
  expect(html).not.toContain("<video");
});

test("the beam loop is muted, inline, phone-aware and plays only on screen", () => {
  const { container } = render(<SignalPortrait {...props} />);
  const video = container.querySelector<HTMLVideoElement>(
    "[data-signal-beam-video]",
  )!;

  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.hasAttribute("playsinline")).toBe(true);
  expect(video.getAttribute("preload")).toBe("none");
  const sources = [...video.querySelectorAll("source")].map((source) => [
    source.getAttribute("media"),
    source.getAttribute("src"),
  ]);
  expect(sources).toEqual([
    ["(max-width: 767px)", "/video/signal-converge-loop-mobile.mp4"],
    [null, "/video/signal-converge-loop.mp4"],
  ]);
  expect(play).not.toHaveBeenCalled();

  setOnscreen(true);
  expect(play).toHaveBeenCalledTimes(1);

  setOnscreen(false);
  expect(pause).toHaveBeenCalled();
});

test("the pause control pauses the beam", () => {
  render(<SignalPortrait {...props} />);
  setOnscreen(true);
  pause.mockClear();

  act(() => setEffectsPaused(true));

  expect(pause).toHaveBeenCalledTimes(1);
});

test("with reduced motion the poster stays and no video is made", () => {
  reducedMotion.mockReturnValue(true);
  const { container } = render(<SignalPortrait {...props} />);
  setOnscreen(true);

  expect(container.querySelectorAll("video")).toHaveLength(0);
  expect(container.querySelector("[data-signal-beam-still]")).not.toBeNull();
});
