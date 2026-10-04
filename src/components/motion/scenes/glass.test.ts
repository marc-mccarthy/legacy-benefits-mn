import {
  BufferGeometry,
  type Group,
  type Mesh,
  MeshPhysicalMaterial,
  type Scene,
  ShaderMaterial,
} from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import createGlass from "./glass";

const state = vi.hoisted(() => ({
  rendered: [] as Scene[],
  load: vi.fn(),
  rendererBuilt: vi.fn(),
  map: { mapping: 0, colorSpace: "", dispose: vi.fn() },
  environment: { texture: {}, dispose: vi.fn() },
  pmremDispose: vi.fn(),
  pmremFails: false,
  release: vi.fn(),
}));

vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof import("three")>()),
  TextureLoader: class {
    loadAsync = state.load;
  },
  PMREMGenerator: class {
    fromEquirectangular() {
      if (state.pmremFails) throw new Error("pmrem failed");
      return state.environment;
    }
    dispose = state.pmremDispose;
  },
  WebGLRenderer: class {
    constructor() {
      state.rendererBuilt();
    }
    setPixelRatio() {}
    setClearColor() {}
    setSize() {}
    render(scene: Scene) {
      state.rendered.push(scene);
    }
    dispose = state.release;
    forceContextLoss() {}
  },
}));

const TOKENS: Record<string, string> = {
  "--color-ground-dark": "#081a3a",
  "--color-star-gold": "#ffc000",
  "--color-signal-cyan": "#00e0e0",
  "--color-ground-light": "#f7f9fa",
};

const rect = (left: number, top: number, width: number, height: number) => ({
  getBoundingClientRect: () => ({ left, top, width, height }),
});

function canvasIn(panes: { shape: string; left: number; top: number }[]) {
  const parent = {
    ...rect(100, 1000, 1200, 600),
    querySelector: () => ({ scrollLeft: 0 }),
    querySelectorAll: () =>
      panes.map(({ shape, left, top }) => ({
        dataset: { cardWindow: shape },
        ...rect(left, top, 400, 250),
      })),
  };
  return { parentElement: parent } as unknown as HTMLCanvasElement;
}

const groups = () =>
  (state.rendered.at(-1)!.children as Group[]).filter((child) => child.isGroup);

beforeEach(() => {
  state.rendered.length = 0;
  state.pmremFails = false;
  state.load.mockReset().mockResolvedValue(state.map);
  vi.stubGlobal("window", { devicePixelRatio: 1, scrollY: 0 });
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal("document", { documentElement: {} });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) => TOKENS[name] ?? "",
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

test("a failed studio map load rejects before any WebGL context is made", async () => {
  state.load.mockRejectedValueOnce(new Event("error"));

  await expect(
    createGlass(canvasIn([]), { reducedQuality: false }),
  ).rejects.toThrow("glass: the studio map did not load");
  expect(state.rendererBuilt).not.toHaveBeenCalled();
});

test("a failed PMREM bake releases the WebGL context and the studio map", async () => {
  state.pmremFails = true;

  await expect(
    createGlass(canvasIn([]), { reducedQuality: false }),
  ).rejects.toThrow("pmrem failed");
  expect(state.release).toHaveBeenCalledTimes(1);
  expect(state.map.dispose).toHaveBeenCalledTimes(1);
});

test("lights the scene from the studio map through PMREM and frees the source", async () => {
  const handle = await createGlass(canvasIn([]), { reducedQuality: false });
  handle.resize(1200, 600);

  const scene = state.rendered[0];
  expect(scene.environment).toBe(state.environment.texture);
  expect(state.map.colorSpace).toBe("srgb");
  expect(state.map.dispose).toHaveBeenCalledTimes(1);
  expect(state.pmremDispose).toHaveBeenCalledTimes(1);
});

test("centres each object on its card window with y flipped and hides the rest", async () => {
  const handle = await createGlass(
    canvasIn([{ shape: "shield", left: 500, top: 1100 }]),
    { reducedQuality: false },
  );

  handle.resize(1200, 600);

  const visible = groups().filter((group) => group.visible);
  expect(visible).toHaveLength(1);
  expect(visible[0].position.x).toBe(500 - 100 + 200 - 600);
  expect(visible[0].position.y).toBe(300 - (1100 - 1000 + 125));
  const [back, object] = visible[0].children as Mesh[];
  expect(back.scale.x).toBe(400);
  expect(back.scale.y).toBe(250);
  expect(object.material).toBeInstanceOf(MeshPhysicalMaterial);
  expect((object.material as MeshPhysicalMaterial).transmission).toBe(1);
});

test("ignores a window whose shape the scene does not know", async () => {
  const handle = await createGlass(
    canvasIn([{ shape: "", left: 0, top: 1000 }]),
    { reducedQuality: false },
  );

  handle.resize(1200, 600);

  expect(groups().filter((group) => group.visible)).toHaveLength(0);
});

test("scrolling adds spin on top of the slow base turn", async () => {
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal(
    "requestAnimationFrame",
    vi.fn((callback: FrameRequestCallback) => frames.push(callback)),
  );
  const turnAfter = async (scrollY: number) => {
    const scrolled = { devicePixelRatio: 1, scrollY: 0 };
    vi.stubGlobal("window", scrolled);
    const handle = await createGlass(
      canvasIn([{ shape: "knot", left: 100, top: 1000 }]),
      { reducedQuality: false },
    );
    handle.setRunning(true);
    frames.at(-1)!(1000);
    scrolled.scrollY = scrollY;
    frames.at(-1)!(1016);
    return (groups()[0].children[1] as Mesh).rotation.y;
  };

  const still = await turnAfter(0);
  const scrolled = await turnAfter(200);

  expect(still).toBeCloseTo(0.3 * 0.016);
  expect(scrolled - still).toBeCloseTo(0.02);
});

test("dispose frees geometries, materials, the environment and the context", async () => {
  const geometry = vi.spyOn(BufferGeometry.prototype, "dispose");
  const physical = vi.spyOn(MeshPhysicalMaterial.prototype, "dispose");
  const shader = vi.spyOn(ShaderMaterial.prototype, "dispose");
  const handle = await createGlass(canvasIn([]), { reducedQuality: false });

  handle.dispose();

  expect(geometry).toHaveBeenCalledTimes(4);
  expect(physical).toHaveBeenCalledTimes(1);
  expect(shader).toHaveBeenCalledTimes(1);
  expect(state.environment.dispose).toHaveBeenCalledTimes(1);
  expect(state.release).toHaveBeenCalledTimes(1);
});
