export type LakeGrade = {
  exposure: number;
  glowStrength: number;
  stars: number;
  dusk: number;
};

const KEYS: [number, LakeGrade][] = [
  [0, { exposure: 0.2, glowStrength: 0.25, stars: 0.35, dusk: 0.25 }],
  [0.35, { exposure: 1, glowStrength: 0.3, stars: 0, dusk: 0 }],
  [0.7, { exposure: 0.7, glowStrength: 0.9, stars: 0, dusk: 0.4 }],
  [1, { exposure: 0.8, glowStrength: 0.4, stars: 1, dusk: 1 }],
];

const lerp = (a: number, b: number, t: number) => a + (b - a) * t;

export function lakeGrade(progress: number): LakeGrade {
  const p = Number.isNaN(progress) ? 0 : Math.min(1, Math.max(0, progress));
  const next = KEYS.findIndex(([at]) => at >= p);
  const [endAt, end] = KEYS[next]!;
  if (endAt === p) return { ...end };
  const [startAt, start] = KEYS[next - 1]!;
  const t = (p - startAt) / (endAt - startAt);
  return {
    exposure: lerp(start.exposure, end.exposure, t),
    glowStrength: lerp(start.glowStrength, end.glowStrength, t),
    stars: lerp(start.stars, end.stars, t),
    dusk: lerp(start.dusk, end.dusk, t),
  };
}
