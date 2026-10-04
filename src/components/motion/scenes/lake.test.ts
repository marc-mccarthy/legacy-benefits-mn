import {
  BufferGeometry,
  PlaneGeometry,
  PointsMaterial,
  ShaderMaterial,
} from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import createLake from "./lake";

const texture = vi.hoisted(() => ({
  colorSpace: "",
  dispose: vi.fn(),
}));

vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof import("three")>()),
  TextureLoader: class {
    loadAsync = async () => texture;
  },
  WebGLRenderer: class {
    constructor() {
      throw new Error("no WebGL here");
    }
  },
}));

const TOKENS: Record<string, string> = {
  "--color-star-gold": " #123456",
  "--color-ground-dark": " #654321",
};

beforeEach(() => {
  texture.dispose.mockClear();
  vi.stubGlobal("document", { documentElement: {} });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) => TOKENS[name] ?? "",
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("disposes the plate, geometries and materials, then rethrows, when the renderer cannot be built", async () => {
  const geometry = vi.spyOn(BufferGeometry.prototype, "dispose");
  const shader = vi.spyOn(ShaderMaterial.prototype, "dispose");
  const points = vi.spyOn(PointsMaterial.prototype, "dispose");

  await expect(
    createLake({} as HTMLCanvasElement, { reducedQuality: false }),
  ).rejects.toThrow("no WebGL here");

  expect(texture.dispose).toHaveBeenCalledTimes(1);
  expect(geometry).toHaveBeenCalledTimes(2);
  expect(geometry.mock.contexts.some((g) => g instanceof PlaneGeometry)).toBe(
    true,
  );
  expect(shader).toHaveBeenCalledTimes(1);
  expect(points).toHaveBeenCalledTimes(1);
});

test("grades with the star-gold and ground-dark palette tokens", async () => {
  const shader = vi.spyOn(ShaderMaterial.prototype, "dispose");
  const points = vi.spyOn(PointsMaterial.prototype, "dispose");

  await expect(
    createLake({} as HTMLCanvasElement, { reducedQuality: false }),
  ).rejects.toThrow();

  const { uniforms } = shader.mock.contexts[0] as ShaderMaterial;
  expect(uniforms.uGold!.value.getHexString()).toBe("123456");
  expect(uniforms.uNavy!.value.getHexString()).toBe("654321");
  expect((points.mock.contexts[0] as PointsMaterial).color.getHexString()).toBe(
    "123456",
  );
});

test("draws at most 200 stars", async () => {
  const geometry = vi.spyOn(BufferGeometry.prototype, "dispose");

  await expect(
    createLake({} as HTMLCanvasElement, { reducedQuality: false }),
  ).rejects.toThrow();

  const stars = geometry.mock.contexts.find(
    (g) => !(g instanceof PlaneGeometry),
  ) as BufferGeometry;
  expect(stars.getAttribute("position").count).toBeLessThanOrEqual(200);
});
