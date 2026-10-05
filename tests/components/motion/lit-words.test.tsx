import { cleanup, render } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import { LitWords } from "@/components/motion/lit-words";

afterEach(cleanup);

const TEXT = "Medicare comes at you from every direction.";

function readable(node: Node): string {
  if (node instanceof HTMLElement && node.getAttribute("aria-hidden"))
    return "";
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  return [...node.childNodes].map(readable).join("");
}

test("exposes the sentence to assistive tech exactly once", () => {
  const { container } = render(<LitWords>{TEXT}</LitWords>);
  const paragraph = container.querySelector("[data-lit-words]")!;
  expect(readable(paragraph)).toBe(TEXT);
});

test("draws an unlit base and a hidden white layer for every word", () => {
  const { container } = render(<LitWords>{TEXT}</LitWords>);
  const words = TEXT.split(" ").length;
  expect(container.querySelectorAll(".text-unlit")).toHaveLength(words);
  const lit = container.querySelectorAll("[data-lit-word]");
  expect(lit).toHaveLength(words);
  for (const layer of lit) {
    expect(layer.getAttribute("aria-hidden")).toBe("true");
    expect(layer.className).toContain("text-on-surface");
  }
});
