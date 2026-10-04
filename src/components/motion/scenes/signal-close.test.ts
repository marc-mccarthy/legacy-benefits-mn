import { BufferGeometry, PointsMaterial } from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import createSignalClose from "./signal-close";

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

beforeEach(() => {
  vi.stubGlobal("document", { documentElement: {} });
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) =>
      name === "--color-star-gold" ? " #123456" : "",
  }));
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

test("disposes the sprite, geometries and materials, then rethrows, when the renderer cannot be built", async () => {
  const geometry = vi.spyOn(BufferGeometry.prototype, "dispose");
  const material = vi.spyOn(PointsMaterial.prototype, "dispose");

  await expect(
    createSignalClose({} as HTMLCanvasElement, { reducedQuality: true }),
  ).rejects.toThrow("no WebGL here");

  expect(texture.dispose).toHaveBeenCalledTimes(1);
  expect(geometry).toHaveBeenCalledTimes(3);
  expect(material).toHaveBeenCalledTimes(3);
});

test("tints every star layer with the star-gold palette token", async () => {
  const material = vi.spyOn(PointsMaterial.prototype, "dispose");

  await expect(
    createSignalClose({} as HTMLCanvasElement, { reducedQuality: true }),
  ).rejects.toThrow();

  const colors = material.mock.contexts.map((layer) =>
    (layer as PointsMaterial).color.getHexString(),
  );
  expect(colors).toEqual(["123456", "123456", "123456"]);
});
