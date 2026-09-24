/**
 * Durations are milliseconds; `motion/react` takes `duration` in seconds, so
 * consumers divide by 1000. The same nine values exist as CSS custom properties
 * in `src/app/globals.css`; `motion.test.ts` compares the two files.
 */

export const DURATION_STATE = 140;

export const DURATION_EXIT = 180;

export const DURATION_ENTER = 240;

export const DURATION_SHEET = 220;

export const DURATION_REVEAL = 320;

export const DURATION_MORPH = 400;

export const EASE_ENTER = [0.22, 1, 0.36, 1] as const;

export const EASE_EXIT = [0.4, 0, 1, 1] as const;

export const EASE_MOVE = [0.4, 0, 0.2, 1] as const;
