import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  OrthographicCamera,
  Points,
  PointsMaterial,
  Scene,
  SRGBColorSpace,
  TextureLoader,
  WebGLRenderer,
} from "three";
import { media } from "@/content/media";
import { seededRandom } from "@/lib/portrait-points";
import type { SceneFactory } from "./types";

const SEED = 20261003;
const GOLD = "#FFC000";

const LAYERS = [
  { count: 900, reduced: 320, size: 8, opacity: 0.5, spin: 0.004 },
  { count: 260, reduced: 100, size: 16, opacity: 0.8, spin: 0.007 },
  { count: 45, reduced: 20, size: 30, opacity: 1, spin: 0.01 },
];

function discPositions(count: number, seed: number): Float32Array {
  const random = seededRandom(seed);
  const positions = new Float32Array(count * 3);
  for (let i = 0; i < count; i += 1) {
    const r = Math.sqrt(random());
    const a = random() * Math.PI * 2;
    positions[i * 3] = Math.cos(a) * r;
    positions[i * 3 + 1] = Math.sin(a) * r;
  }
  return positions;
}

const createSignalClose: SceneFactory = async (canvas, { reducedQuality }) => {
  const texture = await new TextureLoader().loadAsync(
    media["close.starSprite"].src,
  );
  texture.colorSpace = SRGBColorSpace;

  const scene = new Scene();
  const layers = LAYERS.map((layer, index) => {
    const geometry = new BufferGeometry();
    geometry.setAttribute(
      "position",
      new BufferAttribute(
        discPositions(
          reducedQuality ? layer.reduced : layer.count,
          SEED + index,
        ),
        3,
      ),
    );
    const material = new PointsMaterial({
      map: texture,
      color: GOLD,
      size: layer.size,
      sizeAttenuation: false,
      opacity: layer.opacity,
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: AdditiveBlending,
    });
    const points = new Points(geometry, material);
    scene.add(points);
    return { points, geometry, material, layer };
  });
  const camera = new OrthographicCamera(-1, 1, 1, -1, -10, 10);

  const disposeAssets = () => {
    for (const { geometry, material } of layers) {
      geometry.dispose();
      material.dispose();
    }
    texture.dispose();
  };

  let renderer: WebGLRenderer;
  try {
    renderer = new WebGLRenderer({
      canvas,
      alpha: true,
      antialias: false,
      powerPreference: "low-power",
    });
  } catch (error) {
    disposeAssets();
    throw error;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
  renderer.setClearColor(0x000000, 0);

  let frame = 0;

  const tick = (now: number) => {
    const t = now / 1000;
    for (const { points, layer } of layers) points.rotation.z = t * layer.spin;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    setProgress() {},
    setPointer() {},
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
      const radius = Math.hypot(w, h) / 2;
      for (const { points } of layers) points.scale.set(radius, radius, 1);
    },
    dispose() {
      cancelAnimationFrame(frame);
      disposeAssets();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

export default createSignalClose;
