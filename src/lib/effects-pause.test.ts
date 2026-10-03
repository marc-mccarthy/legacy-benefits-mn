// @vitest-environment jsdom

import { createElement } from "react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type EffectsPauseModule = typeof import("./effects-pause");

let mod: EffectsPauseModule;

beforeEach(async () => {
  sessionStorage.clear();
  vi.resetModules();
  mod = await import("./effects-pause");
});

afterEach(() => {
  vi.unstubAllGlobals();
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

  it("defaults to false when sessionStorage does not exist", async () => {
    vi.stubGlobal("sessionStorage", undefined);
    vi.resetModules();

    const fresh = await import("./effects-pause");

    expect(fresh.getEffectsPaused()).toBe(false);
  });

  it("sets the in-memory value without touching storage when sessionStorage does not exist", () => {
    vi.stubGlobal("sessionStorage", undefined);

    mod.setEffectsPaused(true);

    expect(mod.getEffectsPaused()).toBe(true);
  });

  it("returns false during server-side rendering, via getServerSnapshot", () => {
    function Probe() {
      return createElement("span", null, String(mod.useEffectsPaused()));
    }

    expect(renderToString(createElement(Probe))).toContain("false");
  });
});
