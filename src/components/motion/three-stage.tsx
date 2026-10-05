"use client";

import { type ReactNode, useEffect, useId, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { acquireWebGL, releaseWebGL } from "@/lib/webgl-registry";
import type { SceneFactory, SceneHandle, SceneKey } from "./scenes/types";
import { useVisualEffectLifecycle } from "./use-visual-effect-lifecycle";

const sceneLoaders: Record<SceneKey, () => Promise<{ default: SceneFactory }>> =
  {
    "signal-hero": () => import("./scenes/signal-hero"),
    "signal-close": () => import("./scenes/signal-close"),
    glass: () => import("./scenes/glass"),
  };

const CANVAS_CLASS =
  "pointer-events-none absolute inset-0 block h-full w-full print:hidden";

type ThreeStageProps = {
  scene: SceneKey;
  fallback: ReactNode;
  active?: boolean;
  settled?: boolean;
  fineOnly?: boolean;
  className?: string;
};

export function ThreeStage({
  scene,
  fallback,
  active = true,
  settled = false,
  fineOnly = false,
  className,
}: ThreeStageProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const settledRef = useRef(settled);
  const [broken, setBroken] = useState(false);
  const [ready, setReady] = useState(false);
  const { mounted, reduced, paused, onscreen, tabVisible, finePointer } =
    useVisualEffectLifecycle(rootRef);
  const eligible =
    active &&
    !broken &&
    mounted &&
    !reduced &&
    !paused &&
    (!fineOnly || finePointer);
  const live = eligible && onscreen;
  const pending = !mounted || (eligible && !ready);

  useEffect(() => {
    handleRef.current?.setRunning(tabVisible);
  }, [tabVisible]);

  useEffect(() => {
    settledRef.current = settled;
  }, [settled]);

  useEffect(() => {
    const root = rootRef.current;
    if (!live || !root) return;

    let disposed = false;
    let acquired = false;
    let frame = 0;
    let handle: SceneHandle | null = null;
    let observer: ResizeObserver | null = null;

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
        const { default: create } = await sceneLoaders[scene]();
        if (disposed) return;
        const created = await create(canvas, {
          reducedQuality: !finePointer,
          settled: settledRef.current,
        });
        if (disposed) {
          created.dispose();
          return;
        }
        handle = created;
        handleRef.current = created;
        root.append(canvas);
        setReady(true);
        resize();
        created.setRunning(!document.hidden);
        observer = new ResizeObserver(resize);
        observer.observe(root);
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
      observer?.disconnect();
      canvas.remove();
      handle?.dispose();
      handleRef.current = null;
      setReady(false);
      if (acquired) releaseWebGL(id);
    };
  }, [live, scene, finePointer, id]);

  return (
    <div
      ref={rootRef}
      data-stage-pending={pending || undefined}
      className={cn("relative", className)}
    >
      {fallback}
    </div>
  );
}
