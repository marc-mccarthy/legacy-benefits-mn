// @vitest-environment jsdom

import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { acquireWebGL, releaseWebGL, webglOwner } from "@/lib/webgl-registry";
import type { SceneFactory, SceneHandle } from "./scenes/types";
import { ThreeStage } from "./three-stage";

const reducedMotion = vi.fn<() => boolean>(() => false);
vi.mock("motion/react", () => ({ useReducedMotion: () => reducedMotion() }));

const handle = {
  setRunning: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
} satisfies SceneHandle;
const factory = vi.fn<SceneFactory>(async () => handle);
vi.mock("./scenes/signal-hero", () => ({ default: factory }));

class FakeIntersectionObserver {
  static all: FakeIntersectionObserver[] = [];
  constructor(
    private readonly callback: (entries: IntersectionObserverEntry[]) => void,
  ) {
    FakeIntersectionObserver.all.push(this);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
  trigger(isIntersecting: boolean) {
    act(() => this.callback([{ isIntersecting } as IntersectionObserverEntry]));
  }
}

function setOnscreen(isIntersecting: boolean) {
  for (const observer of FakeIntersectionObserver.all) {
    observer.trigger(isIntersecting);
  }
}

function setTabHidden(hidden: boolean) {
  Object.defineProperty(document, "hidden", {
    configurable: true,
    value: hidden,
  });
  act(() => document.dispatchEvent(new Event("visibilitychange")));
}

const fallback = <p>Nate Best</p>;

beforeEach(() => {
  FakeIntersectionObserver.all = [];
  vi.stubGlobal("IntersectionObserver", FakeIntersectionObserver);
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      disconnect() {}
    },
  );
  vi.stubGlobal("matchMedia", () => ({
    matches: true,
    addEventListener() {},
    removeEventListener() {},
  }));
  reducedMotion.mockReturnValue(false);
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  Reflect.deleteProperty(document, "hidden");
  releaseWebGL("other-scene");
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("server render shows the fallback and no canvas", () => {
  const html = renderToString(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );

  expect(html).toContain("<p>Nate Best</p>");
  expect(html).not.toContain("<canvas");
});

test("reduced motion keeps the fallback and never loads the scene", async () => {
  reducedMotion.mockReturnValue(true);
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);

  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(screen.getByText("Nate Best").isConnected).toBe(true);
  expect(factory).not.toHaveBeenCalled();
  expect(webglOwner()).toBeNull();
});

test("no canvas while another owner holds the WebGL registry", async () => {
  acquireWebGL("other-scene");
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);

  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(factory).not.toHaveBeenCalled();
  expect(webglOwner()).toBe("other-scene");
});

test("takes the stage once the other owner releases it", async () => {
  acquireWebGL("other-scene");
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  releaseWebGL("other-scene");

  await waitFor(() =>
    expect(container.querySelector("canvas[data-three-stage]")).not.toBeNull(),
  );
});

test("mounts the scene canvas over the fallback and starts it", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);

  const canvas = await waitFor(() => {
    const found = container.querySelector("canvas");
    expect(found).not.toBeNull();
    return found as HTMLCanvasElement;
  });
  expect(canvas.dataset.threeStage).toBe("signal-hero");
  expect(canvas.getAttribute("aria-hidden")).toBe("true");
  expect(factory).toHaveBeenCalledWith(canvas, { reducedQuality: false });
  expect(handle.setRunning).toHaveBeenLastCalledWith(true);
  expect(handle.resize).toHaveBeenCalled();
  expect(screen.getByText("Nate Best").isConnected).toBe(true);
  expect(webglOwner()).not.toBeNull();
});

test("hiding the tab stops the scene without disposing it, showing it resumes", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  const canvas = await waitFor(() => {
    const found = container.querySelector("canvas");
    expect(found).not.toBeNull();
    return found;
  });

  setTabHidden(true);
  expect(handle.setRunning).toHaveBeenLastCalledWith(false);
  expect(handle.dispose).not.toHaveBeenCalled();
  expect(container.querySelector("canvas")).toBe(canvas);
  expect(webglOwner()).not.toBeNull();

  setTabHidden(false);
  expect(handle.setRunning).toHaveBeenLastCalledWith(true);
  expect(factory).toHaveBeenCalledTimes(1);
});

test("a scene created while the tab is hidden stays stopped", async () => {
  setTabHidden(true);
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);

  await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());
  expect(handle.setRunning).toHaveBeenCalledWith(false);
  expect(handle.setRunning).not.toHaveBeenCalledWith(true);
});

test("an inactive stage never loads its scene", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" active={false} fallback={fallback} />,
  );
  setOnscreen(true);

  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(factory).not.toHaveBeenCalled();
  expect(webglOwner()).toBeNull();
});

test("deactivating a live stage disposes it and frees the registry", async () => {
  const { container, rerender } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());

  rerender(
    <ThreeStage scene="signal-hero" active={false} fallback={fallback} />,
  );

  expect(container.querySelector("canvas")).toBeNull();
  expect(handle.dispose).toHaveBeenCalledTimes(1);
  expect(webglOwner()).toBeNull();
  expect(screen.getByText("Nate Best").isConnected).toBe(true);
});

test("context loss removes the canvas, disposes, releases and keeps the fallback", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  const canvas = await waitFor(() => {
    const found = container.querySelector("canvas");
    expect(found).not.toBeNull();
    return found as HTMLCanvasElement;
  });

  act(() => {
    canvas.dispatchEvent(new Event("webglcontextlost", { cancelable: true }));
  });

  expect(container.querySelector("canvas")).toBeNull();
  expect(handle.dispose).toHaveBeenCalledTimes(1);
  expect(webglOwner()).toBeNull();
  expect(screen.getByText("Nate Best").isConnected).toBe(true);

  setOnscreen(false);
  setOnscreen(true);
  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(factory).toHaveBeenCalledTimes(1);
});

test("leaving the viewport disposes the scene and frees the registry", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());

  setOnscreen(false);

  expect(container.querySelector("canvas")).toBeNull();
  expect(handle.dispose).toHaveBeenCalledTimes(1);
  expect(webglOwner()).toBeNull();
});

test("pausing effects disposes the scene and frees the registry", async () => {
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());

  act(() => setEffectsPaused(true));

  expect(container.querySelector("canvas")).toBeNull();
  expect(webglOwner()).toBeNull();
});

test("unmount disposes the scene and releases the registry", async () => {
  const { container, unmount } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  await waitFor(() => expect(container.querySelector("canvas")).not.toBeNull());

  unmount();

  expect(handle.dispose).toHaveBeenCalledTimes(1);
  expect(webglOwner()).toBeNull();
});

test("unmount before the scene resolves disposes it once it arrives", async () => {
  let resolve: (value: SceneHandle) => void = () => {};
  factory.mockImplementationOnce(
    () => new Promise<SceneHandle>((done) => (resolve = done)),
  );
  const { unmount } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  await waitFor(() => expect(factory).toHaveBeenCalled());

  unmount();
  expect(webglOwner()).toBeNull();
  await act(async () => resolve(handle));

  expect(handle.dispose).toHaveBeenCalledTimes(1);
  expect(document.querySelector("canvas")).toBeNull();
});

test("a scene that fails to start keeps the fallback and frees the registry", async () => {
  const failure = new Error("Error creating WebGL context.");
  const reportError = vi.fn();
  vi.stubGlobal("reportError", reportError);
  factory.mockRejectedValueOnce(failure);
  const { container } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);

  await waitFor(() => expect(factory).toHaveBeenCalled());
  await act(async () => {});
  expect(container.querySelector("canvas")).toBeNull();
  expect(webglOwner()).toBeNull();
  expect(screen.getByText("Nate Best").isConnected).toBe(true);
  expect(reportError).toHaveBeenCalledWith(failure);
});

test("unmount while the scene module loads never creates a context", async () => {
  const { unmount } = render(
    <ThreeStage scene="signal-hero" fallback={fallback} />,
  );
  setOnscreen(true);
  unmount();

  await act(async () => {});
  expect(factory).not.toHaveBeenCalled();
  expect(webglOwner()).toBeNull();
});
