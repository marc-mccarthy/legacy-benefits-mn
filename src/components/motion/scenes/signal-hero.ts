import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  WebGLRenderer,
} from "three";
import { media } from "@/content/media";
import { DURATION_CONVERGE } from "@/lib/motion";
import { stipplePortrait } from "@/lib/portrait-points";
import { easeMove, fieldPositions, noisePositions } from "@/lib/signal-field";
import { paletteColor } from "./palette";
import type { SceneFactory } from "./types";

const SEED = 20261002;

const VERTEX = `
attribute float aLum;
attribute float aPhase;
uniform float uSettle;
uniform float uTime;
uniform float uSize;
varying float vLum;
void main() {
  float drift = 1.0 - uSettle;
  vec3 p = position;
  p.x += sin(uTime * 0.6 + aPhase * 6.2831) * 18.0 * drift;
  p.y += cos(uTime * 0.45 + aPhase * 9.4247) * 18.0 * drift;
  vLum = mix(0.75, aLum, uSettle);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  gl_PointSize = uSize * mix(1.0, 0.7 + aLum * 0.6, uSettle);
}
`;

const FRAGMENT = `
uniform vec3 uCyan;
uniform vec3 uGold;
uniform float uSettle;
varying float vLum;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.25, 0.5, d);
  vec3 color = mix(uCyan, uGold, uSettle);
  gl_FragColor = vec4(color * vLum * a, a);
}
`;

const cutout = media["nate.cutoutSample"];

const portraits = new Map<
  number,
  Promise<ReturnType<typeof stipplePortrait>>
>();

async function loadCutout(): Promise<ImageData> {
  const image = new Image();
  image.src = cutout.src;
  await image.decode();
  const canvas = document.createElement("canvas");
  canvas.width = cutout.width;
  canvas.height = cutout.height;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) throw new Error("signal-hero: no 2D context to sample");
  context.drawImage(image, 0, 0, cutout.width, cutout.height);
  return context.getImageData(0, 0, cutout.width, cutout.height);
}

function portraitPoints(count: number) {
  let portrait = portraits.get(count);
  if (!portrait) {
    portrait = loadCutout().then((image) =>
      stipplePortrait(image, count, SEED),
    );
    portraits.set(count, portrait);
    portrait.catch(() => portraits.delete(count));
  }
  return portrait;
}

const createSignalHero: SceneFactory = async (canvas, { reducedQuality }) => {
  const cyan = new Color(paletteColor("--color-signal-cyan"));
  const gold = new Color(paletteColor("--color-star-gold"));
  const count = reducedQuality ? 2500 : 6000;
  const { points: portrait, lum } = await portraitPoints(count);
  const noise = noisePositions(count, SEED);
  const phases = noisePositions(count, SEED + 1);

  const noisePx = new Float32Array(count * 2);
  const targetPx = new Float32Array(count * 2);
  const flat = new Float32Array(count * 2);
  const positions = new Float32Array(count * 3);

  const geometry = new BufferGeometry();
  const position = new BufferAttribute(positions, 3);
  geometry.setAttribute("position", position);
  geometry.setAttribute("aLum", new BufferAttribute(lum, 1));
  geometry.setAttribute(
    "aPhase",
    new BufferAttribute(phases.subarray(0, count), 1),
  );

  const uniforms = {
    uSettle: { value: 0 },
    uTime: { value: 0 },
    uSize: { value: 3 },
    uCyan: { value: cyan },
    uGold: { value: gold },
  };
  const material = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms,
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: AdditiveBlending,
  });

  const scene = new Scene();
  scene.add(new Points(geometry, material));
  const camera = new OrthographicCamera(-1, 1, 1, -1, -10, 10);

  const renderer = new WebGLRenderer({
    canvas,
    alpha: true,
    antialias: false,
    powerPreference: "low-power",
  });
  const pixelRatio = Math.min(window.devicePixelRatio, 1.5);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  let settle = 0;
  let start = 0;
  let frame = 0;

  const place = () => {
    fieldPositions(noisePx, targetPx, settle, flat);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = flat[i * 2];
      positions[i * 3 + 1] = flat[i * 2 + 1];
    }
    position.needsUpdate = true;
    uniforms.uSettle.value = settle;
  };

  const layout = (w: number, h: number) => {
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    const scale = Math.min(w / cutout.width, h / cutout.height);
    const halfW = (cutout.width * scale) / 2;
    const halfH = (cutout.height * scale) / 2;
    const centerY = -h / 2 + halfH;
    for (let i = 0; i < count; i += 1) {
      noisePx[i * 2] = noise[i * 2] * w * 0.55;
      noisePx[i * 2 + 1] = noise[i * 2 + 1] * h * 0.55;
      targetPx[i * 2] = portrait[i * 2] * halfW;
      targetPx[i * 2 + 1] = centerY + portrait[i * 2 + 1] * halfH;
    }
    uniforms.uSize.value = Math.max(2.5, (halfH / 260) * 2.6) * pixelRatio;
    place();
    renderer.render(scene, camera);
  };

  const tick = (now: number) => {
    start ||= now;
    settle = easeMove(Math.min((now - start) / DURATION_CONVERGE, 1));
    place();
    uniforms.uTime.value = now / 1000;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };

  return {
    setRunning(on) {
      cancelAnimationFrame(frame);
      if (on) frame = requestAnimationFrame(tick);
    },
    resize(w, h) {
      renderer.setSize(w, h, false);
      layout(w, h);
    },
    dispose() {
      cancelAnimationFrame(frame);
      geometry.dispose();
      material.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    },
  };
};

export default createSignalHero;
