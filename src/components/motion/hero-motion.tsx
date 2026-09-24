"use client";

import Image from "next/image";
import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

export type HeroFrame = { src: string };

type HeroMotionProps = {
  frames: HeroFrame[];
};

const DWELL_MS = 9000;

const ORIGINS = ["50% 50%", "32% 62%", "68% 38%"];

const subscribeNothing = () => () => {};
const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

export function HeroMotion({ frames }: HeroMotionProps) {
  const reduced = useReducedMotion();
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [onscreen, setOnscreen] = useState(true);
  const rootRef = useRef<HTMLDivElement>(null);

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

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnscreen(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted]);

  const running = !paused && onscreen && tabVisible && frames.length > 1;

  useEffect(() => {
    if (!running) return;
    const id = setTimeout(
      () => setIndex((i) => (i + 1) % frames.length),
      DWELL_MS,
    );
    return () => clearTimeout(id);
  }, [running, index, frames.length]);

  if (!mounted || reduced || frames.length < 2) return null;

  const mountedThrough = Math.min(frames.length, index + 2);

  return (
    <>
      <div
        ref={rootRef}
        aria-hidden
        data-hero-motion
        data-slide={index}
        data-paused={paused}
        data-running={running}
        className="absolute inset-0 -z-10 overflow-hidden"
      >
        {frames.slice(0, mountedThrough).map((frame, i) => (
          <div
            key={frame.src}
            data-hero-frame
            data-active={i === index}
            style={{ transformOrigin: ORIGINS[i % ORIGINS.length] }}
            className="absolute inset-0"
          >
            <Image
              src={frame.src}
              alt=""
              fill
              sizes="100vw"
              priority={i === 0}
              className="object-cover"
            />
          </div>
        ))}
      </div>

      <div className="absolute inset-x-0 bottom-0">
        <Container className="flex justify-end pb-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-print-hide
            aria-pressed={paused}
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
            {paused ? "Play background" : "Pause background"}
          </Button>
        </Container>
      </div>
    </>
  );
}
