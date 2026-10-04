// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { Button } from "@/components/ui/button";
import { Magnetic } from "@/components/motion/magnetic";

const reduced = vi.hoisted(() => ({ value: false }));

vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reduced.value,
}));

afterEach(() => {
  cleanup();
  reduced.value = false;
});

function renderCta() {
  const { container } = render(
    <Magnetic>
      <Button asChild size="lg">
        <a href="/contact">Talk to a licensed agent</a>
      </Button>
    </Magnetic>,
  );
  return container.querySelector<HTMLElement>("[data-magnetic]")!;
}

test("wraps the Button, so the Slot still renders one styled link", () => {
  const wrapper = renderCta();
  const links = wrapper.querySelectorAll("a");
  expect(links).toHaveLength(1);
  expect(links[0]?.className).toContain("h-13");
  expect(links[0]?.parentElement).toBe(wrapper);
});

test("carries a transform only when motion is allowed", () => {
  expect(renderCta().style.transform).toBe("none");
  cleanup();
  reduced.value = true;
  expect(renderCta().style.transform).toBe("");
});
