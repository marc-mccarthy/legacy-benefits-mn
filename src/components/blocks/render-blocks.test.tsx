// @vitest-environment jsdom

import { renderToStaticMarkup } from "react-dom/server";
import { expect, test } from "vitest";
import { RenderBlocks } from "./render-blocks";

const emptyData = {
  services: [],
  events: [],
  articles: [],
  stats: [],
  testimonials: [],
  carriers: [],
};

test("RenderBlocks renders no section for an eventCarousel with zero events", () => {
  const html = renderToStaticMarkup(
    <RenderBlocks
      blocks={[{ blockType: "eventCarousel", heading: "Free workshops" }]}
      data={emptyData}
    />,
  );

  expect(html).not.toContain("data-band");
});
