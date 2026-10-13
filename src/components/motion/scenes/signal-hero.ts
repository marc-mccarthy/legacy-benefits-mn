import {
  AdditiveBlending,
  BufferAttribute,
  BufferGeometry,
  Color,
  OrthographicCamera,
  Points,
  Scene,
  ShaderMaterial,
  Vector2,
} from "three";
import { media } from "@/content/media";
import {
  DURATION_CONVERGE,
  DURATION_RELEASE,
  DURATION_STAGE,
} from "@/lib/motion";
import { stipplePortrait } from "@/lib/portrait-points";
import { easeMove, fieldPositions, noisePositions } from "@/lib/signal-field";
import { seededRandom } from "@/lib/random";
import { paletteColor } from "./palette";
import { createRenderLoop } from "./render-loop";
import type { SceneFactory } from "./types";

const SEED = 20261002;

const RELEASE_AT = DURATION_CONVERGE + DURATION_STAGE;

const INTRO = RELEASE_AT + DURATION_RELEASE;

function haloOrbits(count: number): Float32Array {
  const random = seededRandom(SEED + 2);
  const orbits = new Float32Array(count * 2);
  for (let i = 0; i < count; i += 1) {
    orbits[i * 2] = random() * Math.PI * 2;
    orbits[i * 2 + 1] = 1 + Math.pow(random(), 1.6) * 1.6;
  }
  return orbits;
}

const VERTEX = `
attribute float aLum;
attribute float aPhase;
attribute vec2 aHalo;
uniform float uSettle;
uniform float uRelease;
uniform float uTime;
uniform float uSize;
uniform vec2 uCenter;
uniform vec2 uRadius;
varying float vLum;
void main() {
  float drift = 1.0 - uSettle + uRelease * 0.7;
  float spin = (0.03 + abs(aPhase) * 0.07) * sign(aPhase + 0.001);
  float angle = aHalo.x + uTime * spin;
  vec2 halo = uCenter + vec2(cos(angle), sin(angle)) * uRadius * aHalo.y;
  vec3 p = vec3(mix(position.xy, halo, uRelease), position.z);
  p.x += sin(uTime * 0.6 + aPhase * 6.2831) * 18.0 * drift;
  p.y += cos(uTime * 0.45 + aPhase * 9.4247) * 18.0 * drift;
  float twinkle = 0.5 + 0.5 * sin(uTime * (0.7 + abs(aPhase)) + aPhase * 40.0);
  float below = smoothstep(-0.1, -0.9, sin(angle));
  float dust = (0.45 + 0.6 * twinkle) * (1.0 - below * 0.85);
  vLum = mix(mix(0.75, aLum, uSettle), dust, uRelease);
  gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
  float settled = mix(1.0, 0.7 + aLum * 0.6, uSettle);
  gl_PointSize = uSize * mix(settled, 0.8 + abs(aPhase) * 1.3, uRelease);
}
`;

const FRAGMENT = `
uniform vec3 uCyan;
uniform vec3 uGold;
uniform float uSettle;
uniform float uRelease;
uniform float uFade;
varying float vLum;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = 1.0 - smoothstep(0.25 * (1.0 - uRelease), 0.5, d);
  vec3 color = mix(uCyan, uGold, uSettle);
  gl_FragColor = vec4(color * vLum * a * uFade, a * uFade);
}
`;

const cutout = media["hero.mazeSample"];

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

const createSignalHero: SceneFactory = async (
  canvas,
  { reducedQuality, settled = false },
) => {
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
  geometry.setAttribute("aHalo", new BufferAttribute(haloOrbits(count), 2));

  const uniforms = {
    uSettle: { value: 0 },
    uRelease: { value: settled ? 1 : 0 },
    uFade: { value: settled ? 0 : 1 },
    uTime: { value: 0 },
    uSize: { value: 3 },
    uCenter: { value: new Vector2() },
    uRadius: { value: new Vector2() },
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

  let settle = settled ? 1 : 0;
  let begin = 0;

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
    const centerY = 0;
    for (let i = 0; i < count; i += 1) {
      noisePx[i * 2] = noise[i * 2] * w * 0.55;
      noisePx[i * 2 + 1] = noise[i * 2 + 1] * h * 0.55;
      targetPx[i * 2] = portrait[i * 2] * halfW;
      targetPx[i * 2 + 1] = centerY + portrait[i * 2 + 1] * halfH;
    }
    uniforms.uCenter.value.set(0, centerY);
    uniforms.uRadius.value.set(halfW * 0.72, halfH * 0.72);
    uniforms.uSize.value = Math.max(2.5, (halfH / 260) * 2.6) * pixelRatio;
    place();
    renderer.render(scene, camera);
  };

  const { renderer, setRunning, release } = createRenderLoop(canvas, {
    onFrame(now) {
      begin ||= now;
      const elapsed = now - begin + (settled ? INTRO : 0);
      const next = easeMove(Math.min(elapsed / DURATION_CONVERGE, 1));
      if (next !== settle) {
        settle = next;
        place();
      }
      uniforms.uRelease.value = easeMove(
        Math.min(Math.max((elapsed - RELEASE_AT) / DURATION_RELEASE, 0), 1),
      );
      if (settled) {
        uniforms.uFade.value = Math.min((now - begin) / DURATION_STAGE, 1);
      }
      uniforms.uTime.value = now / 1000;
      renderer.render(scene, camera);
    },
  });
  const pixelRatio = renderer.getPixelRatio();

  return {
    setRunning,
    resize(w, h) {
      renderer.setSize(w, h, false);
      layout(w, h);
    },
    dispose() {
      geometry.dispose();
      material.dispose();
      release();
    },
  };
};

export default createSignalHero;
