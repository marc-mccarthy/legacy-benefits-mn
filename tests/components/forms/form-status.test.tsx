import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { FormStatus } from "@/components/forms/fields";

test("a large status panel is tall, padded and set in bigger type", () => {
  const html = renderToStaticMarkup(
    <FormStatus tone="success" title="Successfully sent." large>
      Body
    </FormStatus>,
  );

  expect(html).toContain('data-size="large"');
  expect(html).toContain("min-h-80");
  expect(html).toMatch(
    /<p class="[^"]*text-2xl[^"]*">Successfully sent\.<\/p>/,
  );
  expect(html).toMatch(/<p class="[^"]*text-lg[^"]*">Body<\/p>/);
});

test("the default status panel keeps its compact size", () => {
  const html = renderToStaticMarkup(
    <FormStatus tone="success" title="Recorded.">
      Body
    </FormStatus>,
  );

  expect(html).not.toContain("data-size");
  expect(html).toContain("p-5");
  expect(html).not.toContain("text-2xl");
});

test("both sizes announce themselves to screen readers", () => {
  for (const large of [true, false]) {
    const html = renderToStaticMarkup(
      <FormStatus tone="success" title="Done." large={large} />,
    );
    expect(html).toContain('role="status"');
    expect(html).toContain('aria-live="polite"');
  }
});
