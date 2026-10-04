// @vitest-environment jsdom

import { act, cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { LakeSequence } from "./lake-sequence";

const reducedMotion = vi.fn<() => boolean>(() => false);
vi.mock("motion/react", () => ({ useReducedMotion: () => reducedMotion() }));

vi.mock("@/components/motion/three-stage", () => ({
  ThreeStage: ({
    scene,
    active,
    fallback,
  }: {
    scene: string;
    active: boolean;
    fallback: ReactNode;
  }) => (
    <div data-stage-stub={scene} data-active={String(active)}>
      {fallback}
    </div>
  ),
}));

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
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  play.mockClear();
  pause.mockClear();
});

test("server render shows the dusk still, the copy and no video", () => {
  const html = renderToString(<LakeSequence {...props} />);
  expect(html).toContain("data-lake-still");
  expect(html).toContain("lake-dusk.jpg");
  expect(html).toContain(props.heading);
  expect(html).toContain(props.body);
  expect(html).not.toContain("<video");
  expect(html).toContain("data-lake-track");
});

test("on a phone the loop replaces the scene and plays only while on screen", () => {
  const { container } = render(<LakeSequence {...props} />);
  const video = container.querySelector("video")!;

  expect(container.querySelectorAll("video")).toHaveLength(1);
  expect(video.muted).toBe(true);
  expect(video.loop).toBe(true);
  expect(video.hasAttribute("playsinline")).toBe(true);
  expect(video.getAttribute("preload")).toBe("none");
  expect(video.getAttribute("poster")).toBe("/media/lake-dusk-900.webp");
  expect(video.getAttribute("src")).toBe("/video/mn-lake-dawn-dusk-mobile.mp4");
  expect(
    container
      .querySelector("[data-stage-stub=lake]")
      ?.getAttribute("data-active"),
  ).toBe("false");
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

test("with reduced motion a phone gets the still and no video", () => {
  reducedMotion.mockReturnValue(true);
  const { container } = render(<LakeSequence {...props} />);
  setOnscreen(true);

  expect(container.querySelectorAll("video")).toHaveLength(0);
  expect(container.querySelector("[data-lake-still]")).not.toBeNull();
});

test("from 700 px up the lake scene is active and no video is made", () => {
  phone = false;
  const { container } = render(<LakeSequence {...props} />);
  setOnscreen(true);

  expect(container.querySelectorAll("video")).toHaveLength(0);
  expect(
    container
      .querySelector("[data-stage-stub=lake]")
      ?.getAttribute("data-active"),
  ).toBe("true");
});
