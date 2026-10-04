// @vitest-environment jsdom

import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, expect, test, vi } from "vitest";
import { PageTransition } from "./page-transition";

vi.mock("next/navigation", () => ({ usePathname: () => "/" }));
vi.mock("react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react")>()),
  ViewTransition: ({ children }: { children: ReactNode }) => children,
}));

afterEach(() => {
  cleanup();
  document.documentElement.removeAttribute("data-iris");
});

function click(markup: string) {
  const { container } = render(
    <PageTransition>
      <div dangerouslySetInnerHTML={{ __html: markup }} />
    </PageTransition>,
  );
  container
    .querySelector("a, button")!
    .addEventListener("click", (event) => event.preventDefault());
  container
    .querySelector<HTMLElement>("a, button")!
    .dispatchEvent(
      new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 }),
    );
  cleanup();
}

const iris = () => document.documentElement.hasAttribute("data-iris");

test("a same-origin link to another page sets the iris", () => {
  click('<a href="/services">Services</a>');
  expect(iris()).toBe(true);
});

test.each([
  ["a button", "<button>Send</button>"],
  ["an external link", '<a href="https://example.com/">Away</a>'],
  ["a new-tab link", '<a href="/services" target="_blank">Services</a>'],
])("a click on %s clears a stale iris", (_, markup) => {
  click('<a href="/events/x/event.ics">Add to calendar</a>');
  expect(iris()).toBe(true);
  click(markup);
  expect(iris()).toBe(false);
});
