import { seededRandom } from "./random";

const OVERSAMPLE = 4;

type Pixels = Pick<ImageData, "data" | "width" | "height">;

function opaquePixels(alpha: Uint8ClampedArray): number[] {
  const pixels: number[] = [];
  for (let i = 0; i < alpha.length; i += 1) {
    if (alpha[i] > 128) pixels.push(i);
  }
  return pixels;
}

function alphaChannel(data: Uint8ClampedArray): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
  return alpha;
}

export function samplePortraitPoints(
  alpha: Uint8ClampedArray,
  width: number,
  height: number,
  count: number,
  seed: number,
): Float32Array {
  const pixels = opaquePixels(alpha);
  if (pixels.length === 0) {
    throw new Error("samplePortraitPoints: no opaque pixels to sample");
  }
  const random = seededRandom(seed);
  const points = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    const pixel = pixels[Math.floor(random() * pixels.length)];
    const x = (pixel % width) + random();
    const y = Math.floor(pixel / width) + random();
    points[i * 2] = (x / width) * 2 - 1;
    points[i * 2 + 1] = 1 - (y / height) * 2;
  }
  return points;
}

export function luminance(image: Pixels, x: number, y: number): number {
  const px = Math.min(Math.floor(((x + 1) / 2) * image.width), image.width - 1);
  const py = Math.min(
    Math.floor(((1 - y) / 2) * image.height),
    image.height - 1,
  );
  const o = (py * image.width + px) * 4;
  const { data } = image;
  return (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
}

export function stipplePortrait(image: Pixels, count: number, seed: number) {
  const candidates = samplePortraitPoints(
    alphaChannel(image.data),
    image.width,
    image.height,
    count * OVERSAMPLE,
    seed,
  );
  const random = seededRandom(seed + 2);
  const kept = new Uint8Array(candidates.length / 2);
  const points = new Float32Array(count * 2);
  const lum = new Float32Array(count);
  let n = 0;
  const keep = (i: number, l: number) => {
    kept[i] = 1;
    points[n * 2] = candidates[i * 2];
    points[n * 2 + 1] = candidates[i * 2 + 1];
    lum[n] = 0.2 + l * 0.95;
    n += 1;
  };
  for (let i = 0; i < kept.length && n < count; i += 1) {
    const l = luminance(image, candidates[i * 2], candidates[i * 2 + 1]);
    if (random() < 0.06 + 0.94 * Math.pow(l, 1.6)) keep(i, l);
  }
  for (let i = 0; i < kept.length && n < count; i += 1) {
    if (!kept[i]) {
      keep(i, luminance(image, candidates[i * 2], candidates[i * 2 + 1]));
    }
  }
  return { points, lum };
}
