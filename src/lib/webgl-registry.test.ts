import { beforeEach, describe, expect, it, vi } from "vitest";

type WebglRegistryModule = typeof import("./webgl-registry");

let mod: WebglRegistryModule;

beforeEach(async () => {
  vi.resetModules();
  mod = await import("./webgl-registry");
});

describe("webgl registry", () => {
  it("has no owner initially", () => {
    expect(mod.webglOwner()).toBeNull();
  });

  it("grants the first acquire", () => {
    expect(mod.acquireWebGL("stage-a")).toBe(true);
    expect(mod.webglOwner()).toBe("stage-a");
  });

  it("denies a different owner while one holds it", () => {
    mod.acquireWebGL("stage-a");

    expect(mod.acquireWebGL("stage-b")).toBe(false);
    expect(mod.webglOwner()).toBe("stage-a");
  });

  it("allows the same owner to re-acquire", () => {
    mod.acquireWebGL("stage-a");

    expect(mod.acquireWebGL("stage-a")).toBe(true);
    expect(mod.webglOwner()).toBe("stage-a");
  });

  it("frees the registry on release by the owner", () => {
    mod.acquireWebGL("stage-a");

    mod.releaseWebGL("stage-a");

    expect(mod.webglOwner()).toBeNull();
  });

  it("ignores release by a non-owner", () => {
    mod.acquireWebGL("stage-a");

    mod.releaseWebGL("stage-b");

    expect(mod.webglOwner()).toBe("stage-a");
  });

  it("ignores release when nothing is held", () => {
    mod.releaseWebGL("stage-a");

    expect(mod.webglOwner()).toBeNull();
  });

  it("grants a new owner after release", () => {
    mod.acquireWebGL("stage-a");
    mod.releaseWebGL("stage-a");

    expect(mod.acquireWebGL("stage-b")).toBe(true);
    expect(mod.webglOwner()).toBe("stage-b");
  });
});
