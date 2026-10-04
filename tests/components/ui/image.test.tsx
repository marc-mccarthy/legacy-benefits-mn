import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, test } from "vitest";
import { Image } from "@/components/ui/image";

const src = "/media/nate-duotone.jpg";
const derivatives =
  "/media/nate-duotone-480.webp 480w, /media/nate-duotone-651.webp 651w";

const render = (extra: object) =>
  renderToStaticMarkup(
    <Image src={src} alt="Nate" width={160} height={160} {...extra} />,
  );

describe("Image", () => {
  test("without sizes keeps the density srcset and stays lazy", () => {
    const html = render({});
    expect(html).toMatch(/srcSet="[^"]* 1x, [^"]* 2x"/);
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("fetchPriority");
    expect(html).not.toContain("<link");
  });

  test("with sizes lists only the real derivative widths", () => {
    const html = render({ sizes: "160px" });
    expect(html).toContain(`srcSet="${derivatives}"`);
    expect(html).toContain('sizes="160px"');
  });

  test.each([{ priority: true }, { preload: true }])(
    "%o loads eagerly at high priority and preloads the same srcset",
    (flag) => {
      const html = render({ sizes: "160px", ...flag });
      expect(html).toContain('loading="eager"');
      expect(html).toMatch(/<img[^>]*fetchPriority="high"/);
      expect(html).toContain(
        `<link rel="preload" as="image" fetchPriority="high" imageSrcSet="${derivatives}" imageSizes="160px"/>`,
      );
    },
  );
});
