import {
  BufferAttribute,
  BufferGeometry,
  Color,
  Mesh,
  OrthographicCamera,
  PlaneGeometry,
  Points,
  PointsMaterial,
  Scene,
  ShaderMaterial,
  SRGBColorSpace,
  TextureLoader,
  Vector2,
} from "three";
import { media } from "@/content/media";
import { lakeGrade } from "@/lib/lake-grade";
import { seededRandom } from "@/lib/random";
import { paletteColor } from "./palette";
import { createRenderLoop } from "./render-loop";
import type { SceneFactory } from "./types";

const SEED = 20261019;
const STAR_COUNT = 160;

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position.xy, 0.0, 1.0);
}
`;

const FRAGMENT = `
uniform sampler2D uMap;
uniform vec2 uCover;
uniform vec3 uGold;
uniform vec3 uNavy;
uniform float uExposure;
uniform float uGlow;
uniform float uDusk;
varying vec2 vUv;
void main() {
  vec2 uv = (vUv - 0.5) * uCover + 0.5;
  float sky = smoothstep(0.4, 0.48, uv.y);
  float band = exp(-pow((uv.y - 0.45) / 0.09, 2.0));
  vec3 color = texture2D(uMap, uv).rgb * uExposure * 2.0;
  color += uGold * uGlow * band * 0.6;
  color *= mix(vec3(1.0), uGold, uDusk * 0.9);
  color = mix(color, uNavy, uDusk * (1.0 - sky * 0.5) * 0.8);
  gl_FragColor = vec4(color, 1.0);
  #include <colorspace_fragment>
}
`;

function starPositions(): Float32Array {
  const random = seededRandom(SEED);
  const positions = new Float32Array(STAR_COUNT * 3);
  for (let i = 0; i < STAR_COUNT; i += 1) {
    positions[i * 3] = random() * 2 - 1;
    positions[i * 3 + 1] = 0.25 + random() * 0.75;
  }
  return positions;
}

function trackProgress(canvas: HTMLCanvasElement): number {
  const track = canvas.closest("[data-lake-track]");
  if (!track) return 0;
  const r = track.getBoundingClientRect();
  return Math.min(1, Math.max(0, -r.top / (r.height - window.innerHeight)));
}

const createLake: SceneFactory = async (canvas) => {
  const plate = media["lake.source"];
  const gold = new Color(paletteColor("--color-star-gold"));
  const navy = new Color(paletteColor("--color-ground-dark"));
  const map = await new TextureLoader().loadAsync(plate.src);
  map.colorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new OrthographicCamera(-1, 1, 1, -1, -1, 1);
  const plane = new PlaneGeometry(2, 2);
  const grade = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    depthTest: false,
    depthWrite: false,
    uniforms: {
      uMap: { value: map },
      uCover: { value: new Vector2(1, 1) },
      uGold: { value: gold },
      uNavy: { value: navy },
      uExposure: { value: 0 },
      uGlow: { value: 0 },
      uDusk: { value: 0 },
    },
  });
  const starGeometry = new BufferGeometry();
  starGeometry.setAttribute(
    "position",
    new BufferAttribute(starPositions(), 3),
  );
  const starMaterial = new PointsMaterial({
    color: gold,
    size: 2,
    sizeAttenuation: false,
    transparent: true,
    opacity: 0,
    depthTest: false,
    depthWrite: false,
  });
  scene.add(new Mesh(plane, grade), new Points(starGeometry, starMaterial));

  const disposeAssets = () => {
    plane.dispose();
    grade.dispose();
    starGeometry.dispose();
    starMaterial.dispose();
    map.dispose();
  };

  let shown = Number.NaN;
  let label = "";
  const draw = (progress: number) => {
    shown = progress;
    const next = progress.toFixed(2);
    if (next !== label) {
      label = next;
      canvas.dataset.lakeProgress = next;
    }
    const { exposure, glowStrength, stars, dusk } = lakeGrade(progress);
    grade.uniforms.uExposure.value = exposure;
    grade.uniforms.uGlow.value = glowStrength;
    grade.uniforms.uDusk.value = dusk;
    starMaterial.opacity = stars;
    renderer.render(scene, camera);
  };

  let loop: ReturnType<typeof createRenderLoop>;
  try {
    loop = createRenderLoop(canvas, {
      onFrame() {
        const progress = trackProgress(canvas);
        if (progress !== shown) draw(progress);
      },
    });
  } catch (error) {
    disposeAssets();
    throw error;
  }
  const { renderer, setRunning, release } = loop;

  return {
    setRunning,
    resize(w, h) {
      renderer.setSize(w, h, false);
      const aspect = w / h;
      const plateAspect = plate.width / plate.height;
      grade.uniforms.uCover.value.set(
        Math.min(1, aspect / plateAspect),
        Math.min(1, plateAspect / aspect),
      );
      draw(trackProgress(canvas));
    },
    dispose() {
      disposeAssets();
      release();
    },
  };
};

export default createLake;
