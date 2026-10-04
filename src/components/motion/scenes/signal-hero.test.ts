import type { Points, Scene, ShaderMaterial } from "three";
import { afterEach, beforeEach, expect, test, vi } from "vitest";

const rendered = vi.hoisted(() => [] as Scene[]);
const decode = vi.hoisted(() => vi.fn<() => Promise<void>>());

vi.mock("three", async (importOriginal) => ({
  ...(await importOriginal<typeof import("three")>()),
  WebGLRenderer: class {
    setPixelRatio() {}
    getPixelRatio() {
      return 1;
    }
    setClearColor() {}
    setSize() {}
    render(scene: Scene) {
      rendered.push(scene);
    }
    dispose() {}
    forceContextLoss() {}
  },
}));

const TOKENS: Record<string, string> = {
  "--color-signal-cyan": " #abcdef",
  "--color-star-gold": " #123456",
};

async function mount(reducedQuality = true) {
  const { default: create } = await import("./signal-hero");
  return create({} as HTMLCanvasElement, { reducedQuality });
}

beforeEach(() => {
  vi.resetModules();
  rendered.length = 0;
  decode.mockReset().mockResolvedValue(undefined);
  vi.stubGlobal("window", { devicePixelRatio: 1 });
  vi.stubGlobal("requestAnimationFrame", vi.fn());
  vi.stubGlobal("cancelAnimationFrame", vi.fn());
  vi.stubGlobal(
    "Image",
    class {
      src = "";
      decode = decode;
    },
  );
  vi.stubGlobal("getComputedStyle", () => ({
    getPropertyValue: (name: string) => TOKENS[name] ?? "",
  }));
  vi.stubGlobal("document", {
    documentElement: {},
    createElement: () => ({
      getContext: () => ({
        drawImage() {},
        getImageData: (
          _x: number,
          _y: number,
          width: number,
          height: number,
        ) => ({
          data: new Uint8ClampedArray(width * height * 4).fill(255),
          width,
          height,
        }),
      }),
    }),
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

test("draws its first frame on resize, before any animation frame runs", async () => {
  const handle = await mount();

  handle.resize(800, 600);

  expect(rendered).toHaveLength(1);
  expect(requestAnimationFrame).not.toHaveBeenCalled();
});

test("colours the dots from the signal-cyan and star-gold palette tokens", async () => {
  const handle = await mount();
  handle.resize(800, 600);

  const points = rendered[0].children[0] as Points;
  const { uniforms } = points.material as ShaderMaterial;
  expect(uniforms.uCyan.value.getHexString()).toBe("abcdef");
  expect(uniforms.uGold.value.getHexString()).toBe("123456");
});

test("drops a rejected cutout load so a later mount retries it, then reuses the result", async () => {
  decode.mockRejectedValueOnce(new Error("decode failed"));

  await expect(mount()).rejects.toThrow("decode failed");
  await expect(mount()).resolves.toBeDefined();
  await expect(mount()).resolves.toBeDefined();

  expect(decode).toHaveBeenCalledTimes(2);
});
