import { WebGLRenderer } from "three";

export function createRenderLoop(
  canvas: HTMLCanvasElement,
  { onFrame }: { onFrame(now: number): void },
) {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  let frame = 0;
  const tick = (now: number) => {
    onFrame(now);
    frame = requestAnimationFrame(tick);
  };

  return {
    renderer,
    setRunning(on: boolean) {
      cancelAnimationFrame(frame);
      if (on) frame = requestAnimationFrame(tick);
    },
    release() {
      cancelAnimationFrame(frame);
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
}
