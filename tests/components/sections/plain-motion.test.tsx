// @vitest-environment jsdom

import { act, cleanup, fireEvent, render } from "@testing-library/react";
import { renderToString } from "react-dom/server";
import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { setEffectsPaused } from "@/lib/effects-pause";
import { CarrierStrip } from "@/components/sections/carrier-strip";
import { Faq } from "@/components/sections/faq";
import { StatsBand } from "@/components/sections/stats-band";

const reducedMotion = vi.fn<() => boolean>(() => false);
const inView = vi.fn<() => boolean>(() => false);
const animateMock = vi.fn();
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("motion/react")>()),
  useReducedMotion: () => reducedMotion(),
  useInView: () => inView(),
  animate: (...args: unknown[]) => animateMock(...args),
}));

let reducedQuery = false;

beforeEach(() => {
  reducedQuery = false;
  vi.stubGlobal("matchMedia", (query: string) => ({
    matches: query.includes("reduce") ? reducedQuery : false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
  }));
  reducedMotion.mockReturnValue(false);
  inView.mockReturnValue(false);
  animateMock.mockReset();
  setEffectsPaused(false);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const stats = [
  { value: 1400, suffix: "+", label: "Clients served" },
  { value: 11, suffix: "", label: "Years helping Minnesotans" },
];

test("stats serve their real figures for no-JS and screen readers", () => {
  const html = renderToString(<StatsBand stats={stats} />);
  expect(html.match(/1,400\+/g)).toHaveLength(2);
  expect(html).toMatch(/<span aria-hidden="true" data-count-up="">1,400\+/);
  expect(html).toMatch(/<span class="sr-only">1,400\+<\/span>/);
});

test("stats wait at zero, then count up from zero once in view", () => {
  const stop = vi.fn();
  animateMock.mockImplementation(
    (from: number, to: number, options: { onUpdate: (v: number) => void }) => {
      options.onUpdate(from);
      options.onUpdate(to / 2);
      return { stop };
    },
  );
  const { container, rerender } = render(<StatsBand stats={stats} />);
  const counters = container.querySelectorAll("[data-count-up]");
  expect(counters[0]?.textContent).toBe("0+");
  expect(container.querySelector("dd .sr-only")?.textContent).toBe("1,400+");

  inView.mockReturnValue(true);
  rerender(<StatsBand stats={[...stats]} />);

  expect(animateMock).toHaveBeenCalledWith(0, 1400, expect.anything());
  expect(counters[0]?.textContent).toBe("700+");
});

test("stats show the real figure at once under reduced motion", () => {
  reducedMotion.mockReturnValue(true);
  const { container } = render(<StatsBand stats={stats} />);
  expect(container.querySelector("[data-count-up]")?.textContent).toBe(
    "1,400+",
  );
  expect(animateMock).not.toHaveBeenCalled();
});

const carriers = [
  { id: "a", name: "Aetna", approved: true },
  { id: "b", name: "Humana", approved: true },
  { id: "c", name: "Hidden", approved: false },
];

test("the carrier marquee exposes one list and hides its loop copies", () => {
  const { container } = render(<CarrierStrip carriers={carriers} />);
  const marquee = container.querySelector("[data-marquee]")!;
  const lists = marquee.querySelectorAll("ul");

  expect(lists).toHaveLength(3);
  expect(lists[0]?.hasAttribute("aria-hidden")).toBe(false);
  expect(lists[1]?.getAttribute("aria-hidden")).toBe("true");
  expect(lists[2]?.getAttribute("aria-hidden")).toBe("true");
  expect(lists[1]?.hasAttribute("data-marquee-copy")).toBe(true);
  expect(lists[0]?.textContent).toBe("AetnaHumana");
  expect(marquee.getAttribute("tabindex")).toBe("0");
  expect(marquee.getAttribute("aria-labelledby")).toBe("carriers-heading");
});

const items = [{ question: "Does it cost anything?", answer: "No." }];

test("FAQ answers are native details content present without JavaScript", () => {
  const html = renderToString(<Faq items={items} />);
  expect(html).toMatch(/<details data-faq-item="">/);
  expect(html).toContain("<summary");
  expect(html).toContain("No.");
});

test("an FAQ answer opens with a height and opacity animation", async () => {
  let finish = () => {};
  animateMock.mockImplementation(() => {
    const done = new Promise<void>((resolve) => {
      finish = resolve;
    });
    return { stop: vi.fn(), then: done.then.bind(done) };
  });
  const { container } = render(<Faq items={items} />);
  const details = container.querySelector("details")!;
  const panel = container.querySelector<HTMLElement>("[data-faq-panel]")!;

  fireEvent.click(container.querySelector("summary")!);

  expect(details.open).toBe(true);
  expect(animateMock).toHaveBeenCalledWith(
    panel,
    expect.objectContaining({ opacity: 1 }),
    expect.anything(),
  );

  await act(async () => finish());
  expect(panel.style.height).toBe("");

  fireEvent.click(container.querySelector("summary")!);
  expect(details.hasAttribute("data-faq-closing")).toBe(true);
  expect(animateMock).toHaveBeenLastCalledWith(
    panel,
    { height: "0px", opacity: 0 },
    expect.anything(),
  );
  await act(async () => finish());
  expect(details.open).toBe(false);
  expect(details.hasAttribute("data-faq-closing")).toBe(false);
});

test("an FAQ answer toggles natively under reduced motion", () => {
  reducedQuery = true;
  const { container } = render(<Faq items={items} />);
  const summary = container.querySelector("summary")!;
  const event = new MouseEvent("click", { bubbles: true, cancelable: true });

  summary.dispatchEvent(event);

  expect(event.defaultPrevented).toBe(false);
  expect(animateMock).not.toHaveBeenCalled();
});
