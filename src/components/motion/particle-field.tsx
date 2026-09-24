"use client";

import { Pause, Play } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/section";

const REFERENCE_WIDTH = 1440;
const REFERENCE_HEIGHT = 600;
const REFERENCE_COUNT = 40;
const MAX_POINTS = 80;

const RADIUS_MIN = 1;
const RADIUS_MAX = 2;
const ALPHA_MIN = 0.06;
const ALPHA_MAX = 0.22;

const SPEED_MIN = 6;
const SPEED_MAX = 14;

const MAX_FRAME_MS = 50;

const MAX_PIXEL_RATIO = 2;

const WRAP_MARGIN = RADIUS_MAX + 1;

type Point = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  color: string;
};

type Field = { points: Point[]; width: number; height: number };

const between = (low: number, high: number) =>
  low + Math.random() * (high - low);

const wrap = (value: number, extent: number) => {
  const span = extent + WRAP_MARGIN * 2;
  return ((((value + WRAP_MARGIN) % span) + span) % span) - WRAP_MARGIN;
};

const subscribeNothing = () => () => {};
const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

function seedField(
  root: HTMLElement,
  canvas: HTMLCanvasElement,
  ctx: CanvasRenderingContext2D,
): Field {
  const bounds = root.getBoundingClientRect();
  const width = Math.max(1, Math.round(bounds.width));
  const height = Math.max(1, Math.round(bounds.height));

  const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  canvas.width = Math.round(width * ratio);
  canvas.height = Math.round(height * ratio);
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);

  const styles = getComputedStyle(root);
  const palette = [
    styles.getPropertyValue("--scheme-accent").trim(),
    styles.getPropertyValue("--scheme-on-surface").trim(),
  ].filter(Boolean);
  if (palette.length === 0) palette.push(styles.color);

  const count = Math.min(
    MAX_POINTS,
    Math.round(
      (width * height * REFERENCE_COUNT) / (REFERENCE_WIDTH * REFERENCE_HEIGHT),
    ),
  );

  const points = Array.from({ length: count }, () => {
    const heading = Math.random() * Math.PI * 2;
    const speed = between(SPEED_MIN, SPEED_MAX);
    return {
      x: Math.random() * width,
      y: Math.random() * height,
      vx: Math.cos(heading) * speed,
      vy: Math.sin(heading) * speed,
      radius: between(RADIUS_MIN, RADIUS_MAX),
      alpha: between(ALPHA_MIN, ALPHA_MAX),
      color: palette[Math.floor(Math.random() * palette.length)],
    };
  });

  return { points, width, height };
}

function draw(
  ctx: CanvasRenderingContext2D,
  { points, width, height }: Field,
): void {
  ctx.clearRect(0, 0, width, height);
  for (const point of points) {
    ctx.globalAlpha = point.alpha;
    ctx.fillStyle = point.color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, point.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

export function ParticleField() {
  const reduced = useReducedMotion();
  const [paused, setPaused] = useState(false);
  const [onscreen, setOnscreen] = useState(true);
  const [pointCount, setPointCount] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fieldRef = useRef<Field | null>(null);

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

  const [canvasAvailable] = useState(() => {
    if (typeof document === "undefined") return true;
    try {
      return Boolean(document.createElement("canvas").getContext("2d"));
    } catch {
      return false;
    }
  });

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

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    if (!root || !canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const reseed = () => {
      const field = seedField(root, canvas, ctx);
      fieldRef.current = field;
      setPointCount(field.points.length);
      draw(ctx, field);
    };

    reseed();

    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", reseed);
      return () => window.removeEventListener("resize", reseed);
    }
    const observer = new ResizeObserver(reseed);
    observer.observe(root);
    return () => observer.disconnect();
  }, [mounted]);

  const running = !paused && onscreen && tabVisible;

  useEffect(() => {
    if (!running) return;
    const ctx = canvasRef.current?.getContext("2d");
    if (!ctx) return;

    let frame = 0;
    let previous = 0;
    const step = (now: number) => {
      const field = fieldRef.current;
      if (field) {
        const elapsed = previous
          ? Math.min(now - previous, MAX_FRAME_MS) / 1000
          : 0;
        previous = now;
        for (const point of field.points) {
          point.x = wrap(point.x + point.vx * elapsed, field.width);
          point.y = wrap(point.y + point.vy * elapsed, field.height);
        }
        draw(ctx, field);
      }
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, mounted]);

  if (!mounted || reduced || !canvasAvailable) return null;

  return (
    <>
      <div
        ref={rootRef}
        aria-hidden
        data-particle-field
        data-running={running}
        data-paused={paused}
        data-points={pointCount}
        className="pointer-events-none absolute inset-0 -z-10"
      >
        <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
      </div>

      <div className="pointer-events-none absolute inset-x-0 bottom-0">
        <Container className="flex justify-start pb-5">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            data-print-hide
            aria-pressed={paused}
            className="pointer-events-auto"
            onClick={() => setPaused((p) => !p)}
          >
            {paused ? (
              <Play aria-hidden className="size-4" />
            ) : (
              <Pause aria-hidden className="size-4" />
            )}
            {paused ? "Play background field" : "Pause background field"}
          </Button>
        </Container>
      </div>
    </>
  );
}
