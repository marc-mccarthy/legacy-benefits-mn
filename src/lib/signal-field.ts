import { cubicBezier } from "motion/react";
import { EASE_MOVE } from "./motion";
import { seededRandom } from "./random";

export const easeMove = cubicBezier(...EASE_MOVE);

export function fieldPositions(
  noise: Float32Array,
  target: Float32Array,
  t: number,
  out: Float32Array,
): void {
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
