/**
 * Durations are milliseconds; `motion/react` takes `duration` in seconds, so
 * consumers divide by 1000. These four values also exist as CSS custom
 * properties in `src/app/globals.css`, checked in `motion.test.ts` along with
 * six more durations and three more easings that have no TypeScript twin.
 */

export const DURATION_REVEAL = 320;

export const DURATION_HOUSE = 450;

export const EASE_ENTER = [0.22, 1, 0.36, 1] as const;

export const EASE_QUINT = [0.23, 1, 0.32, 1] as const;
