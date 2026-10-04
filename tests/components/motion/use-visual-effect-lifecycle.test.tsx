// @vitest-environment jsdom

import { useRef } from "react";
import { cleanup, render, act, screen } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { useVisualEffectLifecycle } from "@/components/motion/use-visual-effect-lifecycle";

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
  it("reports mounted and onscreen false during SSR", () => {
    const html = renderToString(<Probe />);
    expect(html).toContain('data-mounted="false"');
    expect(html).toContain('data-onscreen="false"');
  });

  it("reports mounted but not onscreen before the observer reports visibility", () => {
    render(<Probe />);

    const state = readState();
    expect(state.mounted).toBe(true);
    expect(state.onscreen).toBe(false);
  });

  it("follows the intersection observer for onscreen", () => {
    render(<Probe />);

    act(() => FakeIntersectionObserver.current?.trigger(true));
    expect(readState().onscreen).toBe(true);

    act(() => FakeIntersectionObserver.current?.trigger(false));
    expect(readState().onscreen).toBe(false);
  });

  it("reports reduced motion", () => {
    useReducedMotionMock.mockReturnValue(true);
    render(<Probe />);

    expect(readState().reduced).toBe(true);
  });

  it("follows the effects pause flag", () => {
    render(<Probe />);
    expect(readState().paused).toBe(false);

    act(() => setEffectsPaused(true));
    expect(readState().paused).toBe(true);

    act(() => setEffectsPaused(false));
    expect(readState().paused).toBe(false);
  });

  it("follows tab visibility", () => {
    render(<Probe />);
    expect(readState().tabVisible).toBe(true);

    act(() => setTabHidden(true));
    expect(readState().tabVisible).toBe(false);

    act(() => setTabHidden(false));
    expect(readState().tabVisible).toBe(true);
  });

  it("reports finePointer from the hover/pointer media query", () => {
    render(<Probe />);
    expect(readState().finePointer).toBe(false);

    act(() => finePointerQuery.set(true));
    expect(readState().finePointer).toBe(true);
  });

  it("stays onscreen false when IntersectionObserver is unavailable", () => {
    vi.stubGlobal("IntersectionObserver", undefined);

    render(<Probe />);

    expect(readState().onscreen).toBe(false);
  });
});
