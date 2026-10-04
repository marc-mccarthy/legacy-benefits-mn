// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { LakeSequence } from "@/components/sections/lake-sequence";

const reducedMotion = vi.fn<() => boolean>(() => false);
const near = vi.fn<() => boolean>(() => true);
let progressListeners: (() => void)[] = [];
let progressValue = 0;
const scrollYProgress = {
  get: () => progressValue,
  on: (_event: string, listener: () => void) => {
    progressListeners.push(listener);
    return () => {
      progressListeners = progressListeners.filter((l) => l !== listener);
    };
  },
};
vi.mock("motion/react", () => ({
  useReducedMotion: () => reducedMotion(),
  useInView: () => near(),
  useScroll: () => ({ scrollYProgress }),
}));

let frames: FrameRequestCallback[] = [];

function setProgress(value: number) {
  progressValue = value;
  for (const listener of progressListeners) act(() => listener());
  const pending = frames;
  frames = [];
  for (const frame of pending) frame(0);
}

let observers: ((entries: IntersectionObserverEntry[]) => void)[] = [];
let phone = true;

const props = {
  heading: "Every season of Medicare, one call away.",
  body: "Nate is here for each part of the year.",
};

function setOnscreen(isIntersecting: boolean) {
  for (const callback of observers) {
    act(() => callback([{ isIntersecting } as IntersectionObserverEntry]));
  }
}

const play = vi.fn(async () => {});
const pause = vi.fn();

beforeEach(() => {
  observers = [];
  phone = true;
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: (entries: IntersectionObserverEntry[]) => void) {
        observers.push(callback);
      }
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query === "(max-width: 699px)" ? phone : false,
    addEventListener() {},
    removeEventListener() {},
  }));
  vi.spyOn(HTMLMediaElement.prototype, "play").mockImplementation(play);
  vi.spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(pause);
  reducedMotion.mockReturnValue(false);
  near.mockReturnValue(true);
  progressListeners = [];
  progressValue = 0;
  frames = [];
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    frames.push(callback);
    return frames.length;
  });
  vi.stubGlobal("cancelAnimationFrame", () => {});
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  play.mockClear();
  pause.mockClear();
});

test("server render shows the stills, the copy and no video", () => {
  const html = renderToString(<LakeSequence {...props} />);
  expect(html).toContain("data-lake-still");
  expect(html).toContain("lake-dusk.jpg");
  expect(html).toMatch(
    /<source media="\(min-width: 700px\)" srcSet="\/media\/mn-lake-desktop-scrub-poster.jpg"/,
  );
  expect(html).toContain(props.heading);
  expect(html).toContain(props.body);
  expect(html).not.toContain("<video");
  expect(html).toContain("data-lake-track");
});

test("on a phone the loop plays only while on screen and no scrub is made", () => {
  const { container } = render(<LakeSequence {...props} />);
  const video = container.querySelector("video")!;

  expect(container.querySelectorAll("video")).toHaveLength(1);
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.hasAttribute("playsinline")).toBe(true);
  expect(video.getAttribute("preload")).toBe("none");
  expect(video.getAttribute("poster")).toBe("/media/lake-dusk-900.webp");
  expect(video.getAttribute("src")).toBe("/video/mn-lake-dawn-dusk-mobile.mp4");
  expect(container.querySelector("[data-lake-scrub]")).toBeNull();
  expect(play).not.toHaveBeenCalled();

  setOnscreen(true);
  expect(play).toHaveBeenCalledTimes(1);

  setOnscreen(false);
  expect(pause).toHaveBeenCalled();
});

test("the pause control pauses and hides the loop so the still shows", () => {
  const { container } = render(<LakeSequence {...props} />);
  setOnscreen(true);
  pause.mockClear();

  act(() => setEffectsPaused(true));

  expect(pause).toHaveBeenCalledTimes(1);
  expect(container.querySelector("video")?.classList).toContain("hidden");
  expect(container.querySelector("[data-lake-still]")).not.toBeNull();
});

test("with reduced motion neither width gets a video", () => {
  reducedMotion.mockReturnValue(true);
  for (const isPhone of [true, false]) {
    phone = isPhone;
    const { container, unmount } = render(<LakeSequence {...props} />);
    setOnscreen(true);
    expect(container.querySelectorAll("video")).toHaveLength(0);
    expect(container.querySelector("[data-lake-still]")).not.toBeNull();
    unmount();
  }
});

test("from 700 px up the scrub video waits until the track nears the viewport", () => {
  phone = false;
  near.mockReturnValue(false);
  const { container } = render(<LakeSequence {...props} />);

  expect(container.querySelectorAll("video")).toHaveLength(0);
  expect(container.querySelector("canvas")).toBeNull();
});

test("from 700 px up scroll progress seeks the scrub video", () => {
  phone = false;
  const { container } = render(<LakeSequence {...props} />);
  const video = container.querySelector<HTMLVideoElement>("[data-lake-scrub]")!;

  expect(container.querySelectorAll("video")).toHaveLength(1);
  expect(video.getAttribute("src")).toBe("/video/mn-lake-desktop-scrub.mp4");
  expect(video.getAttribute("poster")).toBe(
    "/media/mn-lake-desktop-scrub-poster.jpg",
  );
  expect(video.getAttribute("preload")).toBe("metadata");
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(false);
  expect(video.hasAttribute("playsinline")).toBe(true);
  expect(play).not.toHaveBeenCalled();

  let currentTime = 0;
  Object.defineProperty(video, "duration", { value: 12 });
  Object.defineProperty(video, "seeking", { value: false });
  Object.defineProperty(video, "currentTime", {
    get: () => currentTime,
    set: (value: number) => {
      currentTime = value;
    },
  });

  setProgress(0.5);
  expect(currentTime).toBeCloseTo(6);

  setProgress(1);
  expect(currentTime).toBeCloseTo(11.95);
});

test("the pause control hides the scrub so the poster still shows", () => {
  phone = false;
  const { container } = render(<LakeSequence {...props} />);

  act(() => setEffectsPaused(true));

  expect(container.querySelector("[data-lake-scrub]")?.classList).toContain(
    "hidden",
  );
  expect(container.querySelector("[data-lake-still]")).not.toBeNull();
});
