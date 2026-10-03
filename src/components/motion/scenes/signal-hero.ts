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
import { samplePortraitPoints, seededRandom } from "@/lib/portrait-points";
import { easeMove, fieldPositions, noisePositions } from "@/lib/signal-field";
import type { SceneFactory } from "./types";

const SEED = 20261002;
const OVERSAMPLE = 4;
const CYAN = "#00E0E0";
const GOLD = "#FFC000";

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

async function loadCutout(): Promise<ImageData> {
  const cutout = media["nate.cutout"];
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

function alphaChannel(data: Uint8ClampedArray): Uint8ClampedArray {
  const alpha = new Uint8ClampedArray(data.length / 4);
  for (let i = 0; i < alpha.length; i += 1) alpha[i] = data[i * 4 + 3];
  return alpha;
}

function luminance(image: ImageData, x: number, y: number): number {
  const px = Math.floor(((x + 1) / 2) * image.width);
  const py = Math.floor(((1 - y) / 2) * image.height);
  const o = (py * image.width + px) * 4;
  const { data } = image;
  return (0.2126 * data[o] + 0.7152 * data[o + 1] + 0.0722 * data[o + 2]) / 255;
}

function stipple(image: ImageData, count: number) {
  const candidates = samplePortraitPoints(
    alphaChannel(image.data),
    image.width,
    image.height,
    count * OVERSAMPLE,
    SEED,
  );
  const random = seededRandom(SEED + 2);
  const kept = new Uint8Array(candidates.length / 2);
  const portrait = new Float32Array(count * 2);
  const lum = new Float32Array(count);
  let n = 0;
  const keep = (i: number, l: number) => {
    kept[i] = 1;
    portrait[n * 2] = candidates[i * 2];
    portrait[n * 2 + 1] = candidates[i * 2 + 1];
    lum[n] = 0.2 + l * 0.95;
    n += 1;
  };
  for (let i = 0; i < kept.length && n < count; i += 1) {
    const l = luminance(image, candidates[i * 2], candidates[i * 2 + 1]);
    if (random() < 0.06 + 0.94 * Math.pow(l, 1.6)) keep(i, l);
  }
  for (let i = 0; i < kept.length && n < count; i += 1) {
    if (!kept[i]) {
      keep(i, luminance(image, candidates[i * 2], candidates[i * 2 + 1]));
    }
  }
  return { portrait, lum };
}

const createSignalHero: SceneFactory = async (canvas, { reducedQuality }) => {
  const count = reducedQuality ? 2500 : 6000;
  const image = await loadCutout();
  const { portrait, lum } = stipple(image, count);
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
    uCyan: { value: new Color(CYAN) },
    uGold: { value: new Color(GOLD) },
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

  let progress = 0;
  let frame = 0;

  const place = () => {
    fieldPositions(noisePx, targetPx, progress, flat);
    for (let i = 0; i < count; i += 1) {
      positions[i * 3] = flat[i * 2];
      positions[i * 3 + 1] = flat[i * 2 + 1];
    }
    position.needsUpdate = true;
    uniforms.uSettle.value = easeMove(progress);
  };

  const layout = (w: number, h: number) => {
    camera.left = -w / 2;
    camera.right = w / 2;
    camera.top = h / 2;
    camera.bottom = -h / 2;
    camera.updateProjectionMatrix();
    const scale = Math.min(w / image.width, h / image.height);
    const halfW = (image.width * scale) / 2;
    const halfH = (image.height * scale) / 2;
    const centerY = -h / 2 + halfH;
    for (let i = 0; i < count; i += 1) {
      noisePx[i * 2] = noise[i * 2] * w * 0.55;
      noisePx[i * 2 + 1] = noise[i * 2 + 1] * h * 0.55;
      targetPx[i * 2] = portrait[i * 2] * halfW;
      targetPx[i * 2 + 1] = centerY + portrait[i * 2 + 1] * halfH;
    }
    uniforms.uSize.value = Math.max(2.5, (halfH / 260) * 2.6) * pixelRatio;
    place();
  };

  const tick = (now: number) => {
    uniforms.uTime.value = now / 1000;
    renderer.render(scene, camera);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);

  return {
    setProgress(p) {
      progress = Math.min(Math.max(p, 0), 1);
      place();
    },
    setPointer() {},
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
