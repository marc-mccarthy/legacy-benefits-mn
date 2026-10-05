export const DURATION_REVEAL = 320;

export const DURATION_HOUSE = 450;

export const DURATION_CONVERGE = 1600;

export const EASE_MOVE = [0.32, 0.72, 0, 1] as const;

export const DURATION_STAGE = 900;

export const DURATION_RELEASE = 2000;

export const MAGNET_MAX = 6;

export function magnetPull(
  pointer: { x: number; y: number },
  box: { left: number; top: number; width: number; height: number },
): { x: number; y: number } {
  const pull = (offset: number, size: number) =>
    Math.max(-1, Math.min(1, (offset / size) * 2 - 1)) * MAGNET_MAX;
  return {
    x: pull(pointer.x - box.left, box.width),
    y: pull(pointer.y - box.top, box.height),
  };
}
