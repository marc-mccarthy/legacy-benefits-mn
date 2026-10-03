// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EffectsPauseModule = typeof import("./effects-pause");

let mod: EffectsPauseModule;

beforeEach(async () => {
  sessionStorage.clear();
  vi.resetModules();
  mod = await import("./effects-pause");
});

afterEach(() => {
  sessionStorage.clear();
});

describe("effects pause store", () => {
  it("defaults to false", () => {
    expect(mod.getEffectsPaused()).toBe(false);
  });

  it("notifies subscribers when set to true", () => {
    const listener = vi.fn();
    mod.subscribeEffectsPaused(listener);

    mod.setEffectsPaused(true);

    expect(listener).toHaveBeenCalledTimes(1);
    expect(mod.getEffectsPaused()).toBe(true);
  });

  it("survives a module re-import via sessionStorage", async () => {
    mod.setEffectsPaused(true);
    vi.resetModules();

    const reimported = await import("./effects-pause");

    expect(reimported.getEffectsPaused()).toBe(true);
  });

  it("reads a value set before any subscriber exists", () => {
    mod.setEffectsPaused(true);

    const listener = vi.fn();
    mod.subscribeEffectsPaused(listener);

    expect(mod.getEffectsPaused()).toBe(true);
    expect(listener).not.toHaveBeenCalled();
  });
});
