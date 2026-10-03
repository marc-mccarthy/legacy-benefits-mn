export function seededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function opaquePixels(alpha: Uint8ClampedArray): number[] {
  const pixels: number[] = [];
  for (let i = 0; i < alpha.length; i += 1) {
    if (alpha[i] > 128) pixels.push(i);
  }
  return pixels;
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
