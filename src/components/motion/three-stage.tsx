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
    lake: () => import("./scenes/lake"),
  };

const CANVAS_CLASS =
  "pointer-events-none absolute inset-0 block h-full w-full print:hidden";

type ThreeStageProps = {
  scene: SceneKey;
  fallback: ReactNode;
  active?: boolean;
  fineOnly?: boolean;
  className?: string;
};

export function ThreeStage({
  scene,
  fallback,
  active = true,
  fineOnly = false,
  className,
}: ThreeStageProps) {
  const id = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const handleRef = useRef<SceneHandle | null>(null);
  const [broken, setBroken] = useState(false);
  const { mounted, reduced, paused, onscreen, tabVisible, finePointer } =
    useVisualEffectLifecycle(rootRef);
  const live =
    active &&
    !broken &&
    mounted &&
    !reduced &&
    !paused &&
    onscreen &&
    (!fineOnly || finePointer);

  useEffect(() => {
    handleRef.current?.setRunning(tabVisible);
  }, [tabVisible]);

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
        const created = await create(canvas, { reducedQuality: !finePointer });
        if (disposed) {
          created.dispose();
          return;
        }
        handle = created;
        handleRef.current = created;
        root.append(canvas);
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
      if (acquired) releaseWebGL(id);
    };
  }, [live, scene, finePointer, id]);

  return (
    <div ref={rootRef} className={cn("relative", className)}>
      {fallback}
    </div>
  );
}
