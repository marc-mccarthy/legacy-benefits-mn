import { BufferGeometry, PointsMaterial } from "three";
import { afterEach, expect, test, vi } from "vitest";
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

afterEach(() => {
  vi.restoreAllMocks();
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
