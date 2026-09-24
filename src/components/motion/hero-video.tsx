"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Pause, Play } from "lucide-react";

const noopSubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false,
  );
}

function useReducedMotion() {
  const subscribe = (onChange: () => void) => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  };
  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );
}

function useTabVisible() {
  const subscribe = (onChange: () => void) => {
    document.addEventListener("visibilitychange", onChange);
    return () => document.removeEventListener("visibilitychange", onChange);
  };
  return useSyncExternalStore(
    subscribe,
    () => document.visibilityState === "visible",
    () => true,
  );
}

export function HeroVideo({
  src,
  poster,
}: {
  src: string;
  poster?: string | null;
}) {
  const mounted = useMounted();
  const reduced = useReducedMotion();
  const tabVisible = useTabVisible();
  const [paused, setPaused] = useState(false);
  const [onscreen, setOnscreen] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnscreen(entry?.isIntersecting ?? true),
      { rootMargin: "100px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const running = !paused && tabVisible && onscreen;

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    if (running) {
      void video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [running, mounted]);

  if (!mounted || reduced) return null;

  return (
    <div
      ref={rootRef}
      data-hero-video
      data-running={running ? "true" : "false"}
      className="absolute inset-0 -z-10"
    >
      <video
        ref={videoRef}
        data-hero-video-el
        className="size-full object-cover"
        src={src}
        poster={poster ?? undefined}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden
        tabIndex={-1}
      />
      <button
        type="button"
        data-print-hide
        aria-pressed={paused}
        onClick={() => setPaused((value) => !value)}
        className="bg-surface/90 text-on-surface absolute right-4 bottom-4 z-10 inline-flex min-h-11 items-center gap-2 rounded-(--radius-control) px-4 text-base font-semibold"
      >
        {paused ? (
          <Play aria-hidden className="size-4" />
        ) : (
          <Pause aria-hidden className="size-4" />
        )}
        {paused ? "Play background" : "Pause background"}
      </button>
    </div>
  );
}
