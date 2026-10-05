"use client";

import {
  type RefObject,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";
import { useReducedMotion } from "motion/react";
import { useEffectsPaused } from "@/lib/effects-pause";

type VisualEffectLifecycle = {
  mounted: boolean;
  reduced: boolean;
  onscreen: boolean;
  tabVisible: boolean;
  finePointer: boolean;
  paused: boolean;
};

const FINE_POINTER_QUERY = "(hover: hover) and (pointer: fine)";

const subscribeNothing = () => () => {};

const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

const subscribeFinePointer = (onChange: () => void) => {
  const media = matchMedia(FINE_POINTER_QUERY);
  media.addEventListener("change", onChange);
  return () => media.removeEventListener("change", onChange);
};

const getFinePointer = () => matchMedia(FINE_POINTER_QUERY).matches;

export function useVisualEffectLifecycle(
  ref: RefObject<Element | null>,
): VisualEffectLifecycle {
  const reduced = Boolean(useReducedMotion());
  const paused = useEffectsPaused();
  const [onscreen, setOnscreen] = useState(false);

  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  );

  const finePointer = useSyncExternalStore(
    subscribeFinePointer,
    getFinePointer,
    () => false,
  );

  useEffect(() => {
    const node = ref.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnscreen(entry?.isIntersecting ?? false),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [ref, mounted]);

  return {
    mounted,
    reduced,
    onscreen,
    tabVisible,
    finePointer,
    paused,
  };
}
