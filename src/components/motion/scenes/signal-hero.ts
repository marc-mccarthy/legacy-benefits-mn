import { WebGLRenderer } from "three";
import type { SceneFactory } from "./types";

const createSignalHero: SceneFactory = async (canvas, { reducedQuality }) => {
  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  renderer.setPixelRatio(
    Math.min(window.devicePixelRatio, reducedQuality ? 1 : 1.5),
  );
  renderer.setClearColor(0x000000, 0);
  renderer.clear();

  return {
    setProgress() {},
    setPointer() {},
    resize(w, h) {
      renderer.setSize(w, h, false);
      renderer.clear();
    },
    dispose() {
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

export default createSignalHero;
