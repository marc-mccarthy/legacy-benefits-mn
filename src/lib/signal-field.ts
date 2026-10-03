import { seededRandom } from "./portrait-points";

const X1 = 0.32;
const Y1 = 0.72;
const X2 = 0;
const Y2 = 1;

function bezier(t: number, p1: number, p2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t;
}

export function easeMove(x: number): number {
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 40; i += 1) {
    const mid = (lo + hi) / 2;
    if (bezier(mid, X1, X2) < x) lo = mid;
    else hi = mid;
  }
  return bezier((lo + hi) / 2, Y1, Y2);
}

export function fieldPositions(
  noise: Float32Array,
  target: Float32Array,
  progress: number,
  out: Float32Array,
): void {
  const t = easeMove(Math.min(Math.max(progress, 0), 1));
  for (let i = 0; i < out.length; i += 1) {
    out[i] = noise[i] + (target[i] - noise[i]) * t;
  }
}

export function noisePositions(count: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const points = new Float32Array(count * 2);
  for (let i = 0; i < points.length; i += 1) {
    points[i] = random() * 2 - 1;
  }
  return points;
}
