import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { createRenderLoop } from "@/components/motion/scenes/render-loop";

const renderer = vi.hoisted(() => ({
  options: {} as Record<string, unknown>,
  pixelRatio: 0,
  dispose: vi.fn(),
  forceContextLoss: vi.fn(),
}));

vi.mock("three", () => ({
  WebGLRenderer: class {
    constructor(options: Record<string, unknown>) {
      renderer.options = options;
    }
    setPixelRatio(value: number) {
      renderer.pixelRatio = value;
    }
    setClearColor() {}
    dispose = renderer.dispose;
    forceContextLoss = renderer.forceContextLoss;
  },
}));

let frames: FrameRequestCallback[];

beforeEach(() => {
  frames = [];
  vi.stubGlobal("window", { devicePixelRatio: 3 });
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
  );
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("builds a transparent low-power renderer capped at 1.5 dpr", () => {
  createRenderLoop({} as HTMLCanvasElement, { onFrame() {} });

  expect(renderer.options).toMatchObject({
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  expect(renderer.pixelRatio).toBe(1.5);
});

test("runs onFrame every animation frame only while running", () => {
  const onFrame = vi.fn();
  const loop = createRenderLoop({} as HTMLCanvasElement, { onFrame });

  expect(requestAnimationFrame).not.toHaveBeenCalled();
  loop.setRunning(true);
  frames[0](16);
  frames[1](32);
  expect(onFrame.mock.calls).toEqual([[16], [32]]);

  loop.setRunning(false);
  expect(cancelAnimationFrame).toHaveBeenLastCalledWith(3);
  expect(requestAnimationFrame).toHaveBeenCalledTimes(3);
});

test("release stops the loop and gives the context back", () => {
  const loop = createRenderLoop({} as HTMLCanvasElement, { onFrame() {} });
  loop.setRunning(true);

  loop.release();

  expect(cancelAnimationFrame).toHaveBeenLastCalledWith(1);
  expect(renderer.dispose).toHaveBeenCalledTimes(1);
  expect(renderer.forceContextLoss).toHaveBeenCalledTimes(1);
});
