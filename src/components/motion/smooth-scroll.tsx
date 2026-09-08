"use client";

import { useEffect } from "react";
import Lenis from "lenis";

/**
 * Lenis smooth scroll, matching cognacgodet.com and ethnocare.ca.
 *
 * Disabled outright when the visitor prefers reduced motion — hijacking scroll
 * is a vestibular trigger, and on an insurance site the audience skews toward
 * people more likely to be affected by it.
 */
export function SmoothScrollProvider() {
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (query.matches) return;

    const lenis = new Lenis({ duration: 0.9, smoothWheel: true });
    let frame = 0;

    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    // If the preference flips mid-session, hand control straight back.
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) {
        cancelAnimationFrame(frame);
        lenis.destroy();
      }
    };
    query.addEventListener("change", onChange);

    return () => {
      query.removeEventListener("change", onChange);
      cancelAnimationFrame(frame);
      lenis.destroy();
    };
  }, []);

  return null;
}
