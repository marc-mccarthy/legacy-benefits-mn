// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { HeroShader } from "./hero-shader";

vi.mock("motion/react", () => ({ useReducedMotion: () => false }));

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

test("renders nothing when both WebGL context probes return null", () => {
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, "getContext")
    .mockReturnValue(null);

  const { container } = render(<HeroShader />);

  expect(container.innerHTML).toBe("");
  expect(container.querySelectorAll("canvas")).toHaveLength(0);
  expect(container.querySelectorAll("[data-hero-shader]")).toHaveLength(0);
  expect(container.querySelectorAll("button")).toHaveLength(0);
  expect(getContext.mock.calls.map((call) => call[0])).toEqual([
    "webgl2",
    "webgl",
  ]);
});

test("the context probe runs before anything is inserted into the document", () => {
  let canvasesAtProbe = -1;
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(
    function (this: HTMLCanvasElement) {
      canvasesAtProbe = document.querySelectorAll("canvas").length;
      return null;
    } as typeof HTMLCanvasElement.prototype.getContext,
  );

  render(<HeroShader />);

  expect(canvasesAtProbe).toBe(0);
});
