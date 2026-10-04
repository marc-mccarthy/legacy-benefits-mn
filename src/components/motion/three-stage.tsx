"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { acquireWebGL, releaseWebGL } from "@/lib/webgl-registry";
import type { SceneFactory, SceneHandle, SceneKey } from "./scenes/types";
import { useVisualEffectLifecycle } from "./use-visual-effect-lifecycle";

type SceneLoader = () => Promise<{ default: SceneFactory }>;

const sceneLoaders: Partial<Record<SceneKey, SceneLoader>> = {
  "signal-hero": () => import("./scenes/signal-hero"),
  "signal-close": () => import("./scenes/signal-close"),
};

const CANVAS_CLASS =
  "pointer-events-none absolute inset-0 block h-full w-full print:hidden";

type ThreeStageProps = {
  scene: SceneKey;
  progress?: number;
  fallback: ReactNode;
  className?: string;
};

function formatProgress(progress: number): string {
  return progress.toFixed(3);
}

function observeResize(node: Element, onResize: () => void): () => void {
  if (typeof ResizeObserver === "undefined") {
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }
  const observer = new ResizeObserver(onResize);
  observer.observe(node);
  return () => observer.disconnect();
}

export function ThreeStage({
  scene,
  progress = 0,
  fallback,
  className,
}: ThreeStageProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const progressRef = useRef(progress);
  const [broken, setBroken] = useState(false);
  const { running, finePointer } = useVisualEffectLifecycle(rootRef);

  useEffect(() => {
    progressRef.current = progress;
    canvasRef.current?.setAttribute(
      "data-stage-progress",
      formatProgress(progress),
    );
    handleRef.current?.setProgress(progress);
  }, [progress]);

  useEffect(() => {
    const root = rootRef.current;
    const load = sceneLoaders[scene];
    if (!running || broken || !root || !load) return;

    let disposed = false;
    let acquired = false;
    let frame = 0;
    let handle: SceneHandle | null = null;
    let stopResize = () => {};

    const canvas = document.createElement("canvas");
    canvas.className = CANVAS_CLASS;
    canvas.setAttribute("aria-hidden", "true");
    canvas.dataset.threeStage = scene;
    const onLost = () => setBroken(true);
    canvas.addEventListener("webglcontextlost", onLost);

    const resize = () => {
      const bounds = root.getBoundingClientRect();
      handle?.resize(
        Math.max(1, Math.round(bounds.width)),
        Math.max(1, Math.round(bounds.height)),
      );
    };

    const mount = async () => {
      try {
        const { default: create } = await load();
        if (disposed) return;
        const created = await create(canvas, { reducedQuality: !finePointer });
        if (disposed) {
          created.dispose();
          return;
        }
        handle = created;
        handleRef.current = created;
        canvasRef.current = canvas;
        canvas.dataset.stageProgress = formatProgress(progressRef.current);
        created.setProgress(progressRef.current);
        root.append(canvas);
        resize();
        stopResize = observeResize(root, resize);
      } catch (error) {
        reportError(error);
        if (!disposed) setBroken(true);
      }
    };

    const start = () => {
      if (!acquireWebGL(id)) {
        frame = requestAnimationFrame(start);
        return;
      }
      acquired = true;
      void mount();
    };
    start();

    return () => {
      disposed = true;
      cancelAnimationFrame(frame);
      canvas.removeEventListener("webglcontextlost", onLost);
      stopResize();
      canvas.remove();
      handle?.dispose();
      handleRef.current = null;
      canvasRef.current = null;
      if (acquired) releaseWebGL(id);
    };
  }, [running, broken, scene, finePointer, id]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {fallback}
    </div>
  );
}
