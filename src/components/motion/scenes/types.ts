export type SceneKey = "signal-hero" | "signal-close" | "glass" | "lake";

export type SceneHandle = {
  setRunning(on: boolean): void;
  resize(w: number, h: number): void;
  dispose(): void;
};

export type SceneFactory = (
  canvas: HTMLCanvasElement,
  opts: { reducedQuality: boolean },
) => Promise<SceneHandle>;
