import { expect, type Page } from "@playwright/test";

export const HIDE_CHROME = `[data-site-header], [role="dialog"][aria-label="Cookie choices"], [data-effects-pause] { visibility: hidden !important; }`;

export const brightestBackground = async (page: Page, selector: string) => {
  const box = await page.locator(selector).boundingBox();
  expect(box, `${selector} has no box`).not.toBeNull();
  const shot = await page.screenshot({ clip: box!, scale: "css" });
  return page.evaluate(async (png) => {
    const image = new Image();
    image.src = `data:image/png;base64,${png}`;
    await image.decode();
    const canvas = document.createElement("canvas");
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext("2d")!;
    context.drawImage(image, 0, 0);
    const { data } = context.getImageData(0, 0, canvas.width, canvas.height);
    const linear = (channel: number) => {
      const s = channel / 255;
      return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
    };
    let brightest = 0;
    for (let i = 0; i < data.length; i += 4) {
      brightest = Math.max(
        brightest,
        0.2126 * linear(data[i]) +
          0.7152 * linear(data[i + 1]) +
          0.0722 * linear(data[i + 2]),
      );
    }
    return brightest;
  }, shot.toString("base64"));
};

export const luminance = (hex: string) => {
  const [r, g, b] = [1, 3, 5].map((at) => {
    const s = parseInt(hex.slice(at, at + 2), 16) / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

export const contrast = (text: string, background: number) =>
  (luminance(text) + 0.05) / (background + 0.05);
