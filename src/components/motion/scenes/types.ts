export type SceneKey = "signal-hero" | "signal-close" | "glass" | "lake";

export type SceneHandle = {
  setProgress(p: number): void;
  setPointer(x: number, y: number): void;
  setLayout?(rects: DOMRect[]): void;
  resize(w: number, h: number): void;
  dispose(): void;
};

export type SceneFactory = (
  canvas: HTMLCanvasElement,
  opts: { reducedQuality: boolean },
) => Promise<SceneHandle>;
