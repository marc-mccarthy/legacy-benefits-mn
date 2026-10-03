// @vitest-environment jsdom

import { useRef } from "react";
import { cleanup, render, act, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { useVisualEffectLifecycle } from "./use-visual-effect-lifecycle";

const useReducedMotionMock = vi.fn<() => boolean>(() => false);
vi.mock("motion/react", () => ({
  useReducedMotion: () => useReducedMotionMock(),
}));

class FakeMediaQueryList extends EventTarget {
  matches: boolean;
  constructor(matches: boolean) {
    super();
    this.matches = matches;
  }
  set(matches: boolean) {
    this.matches = matches;
    this.dispatchEvent(new Event("change"));
  }
}

let finePointerQuery: FakeMediaQueryList;

class FakeIntersectionObserver {
  static current: FakeIntersectionObserver | null = null;
  constructor(
    private readonly callback: (entries: IntersectionObserverEntry[]) => void,
  ) {
    FakeIntersectionObserver.current = this;
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  trigger(isIntersecting: boolean) {
    this.callback([{ isIntersecting } as IntersectionObserverEntry]);
  }
}

function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
  Object.defineProperty(document, "visibilityState", {
    configurable: true,
    value: hidden ? "hidden" : "visible",
  });
  document.dispatchEvent(new Event("visibilitychange"));
}

function Probe() {
  const ref = useRef<HTMLDivElement>(null);
  const state = useVisualEffectLifecycle(ref);
  return (
    <div
      ref={ref}
      data-testid="probe"
      data-mounted={state.mounted}
      data-reduced={state.reduced}
      data-onscreen={state.onscreen}
      data-tab-visible={state.tabVisible}
      data-fine-pointer={state.finePointer}
      data-paused={state.paused}
      data-running={state.running}
    />
  );
}

function readState() {
  const node = screen.getByTestId("probe") as HTMLDivElement;
  return {
    mounted: node.dataset.mounted === "true",
    reduced: node.dataset.reduced === "true",
    onscreen: node.dataset.onscreen === "true",
    tabVisible: node.dataset.tabVisible === "true",
    finePointer: node.dataset.finePointer === "true",
    paused: node.dataset.paused === "true",
    running: node.dataset.running === "true",
  };
}

beforeEach(() => {
  useReducedMotionMock.mockReturnValue(false);
  finePointerQuery = new FakeMediaQueryList(false);
  vi.stubGlobal("matchMedia", () => finePointerQuery);
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  FakeIntersectionObserver.current = null;
  setTabHidden(false);
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  sessionStorage.clear();
});

describe("useVisualEffectLifecycle", () => {
  it("reports running false during SSR, before mount", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-mounted="false"');
    expect(html).toContain('data-running="false"');
  });

  it("reports running false after mount but before the observer reports visibility", () => {
    render(<Probe />);

    const state = readState();
    expect(state.mounted).toBe(true);
    expect(state.onscreen).toBe(false);
    expect(state.running).toBe(false);
  });

  it("flips running true once onscreen, then false again off screen", () => {
    render(<Probe />);

    act(() => FakeIntersectionObserver.current?.trigger(true));
    expect(readState().running).toBe(true);

    act(() => FakeIntersectionObserver.current?.trigger(false));
    expect(readState().running).toBe(false);
  });

  it("flips running false when reduced motion is preferred", () => {
    useReducedMotionMock.mockReturnValue(true);
    render(<Probe />);
    act(() => FakeIntersectionObserver.current?.trigger(true));

    expect(readState().reduced).toBe(true);
    expect(readState().running).toBe(false);
  });

  it("flips running false when effects are paused", () => {
    render(<Probe />);
    act(() => FakeIntersectionObserver.current?.trigger(true));
    expect(readState().running).toBe(true);

    act(() => setEffectsPaused(true));
    expect(readState().paused).toBe(true);
    expect(readState().running).toBe(false);

    act(() => setEffectsPaused(false));
    expect(readState().running).toBe(true);
  });

  it("flips running false when the tab is hidden", () => {
    render(<Probe />);
    act(() => FakeIntersectionObserver.current?.trigger(true));
    expect(readState().running).toBe(true);

    act(() => setTabHidden(true));
    expect(readState().tabVisible).toBe(false);
    expect(readState().running).toBe(false);

    act(() => setTabHidden(false));
    expect(readState().running).toBe(true);
  });

  it("reports finePointer from the hover/pointer media query, independent of running", () => {
    render(<Probe />);
    expect(readState().finePointer).toBe(false);

    act(() => finePointerQuery.set(true));
    expect(readState().finePointer).toBe(true);
  });
});
