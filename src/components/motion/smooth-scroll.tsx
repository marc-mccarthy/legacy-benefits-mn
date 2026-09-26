"use client";

import { useEffect } from "react";
import Lenis from "lenis";

let instance: Lenis | undefined;
let paused = false;

// Lenis scrolls from its own rAF loop, which an `overflow: hidden` lock does
// not hold; pausing the loop is what lets a modal own the scroll position.
export function pauseSmoothScroll() {
  paused = true;
  instance?.stop();
}

export function resumeSmoothScroll() {
  paused = false;
  instance?.start();
}

export function SmoothScroll() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");

    function start() {
      if (instance) return;
      instance = new Lenis({ autoRaf: true });
      if (paused) instance.stop();
    }

    function stop() {
      instance?.destroy();
      instance = undefined;
    }

    if (!query.matches) start();

    function onChange(event: MediaQueryListEvent) {
      if (event.matches) stop();
      else start();
    }

    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      stop();
    };
  }, []);

  return null;
}
