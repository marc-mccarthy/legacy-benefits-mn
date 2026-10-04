export type SceneKey = "signal-hero" | "signal-close" | "glass";

export type SceneHandle = {
  setRunning(on: boolean): void;
  resize(w: number, h: number): void;
  dispose(): void;
};

export type SceneFactory = (
  canvas: HTMLCanvasElement,
  opts: { reducedQuality: boolean; settled?: boolean },
) => Promise<SceneHandle>;
