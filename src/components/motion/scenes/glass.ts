import {
  type BufferGeometry,
  Color,
  DirectionalLight,
  DoubleSide,
  EquirectangularReflectionMapping,
  ExtrudeGeometry,
  Group,
  LatheGeometry,
  MathUtils,
  Mesh,
  MeshPhysicalMaterial,
  PerspectiveCamera,
  PlaneGeometry,
  PMREMGenerator,
  Scene,
  ShaderMaterial,
  Shape,
  SRGBColorSpace,
  TextureLoader,
  TorusKnotGeometry,
  Vector2,
  type WebGLRenderTarget,
} from "three";
import { media } from "@/content/media";
import { paletteColor } from "./palette";
import { createRenderLoop } from "./render-loop";
import type { SceneFactory } from "./types";

const VERTEX = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

const FRAGMENT = `
uniform vec3 uNavy;
uniform vec3 uGold;
uniform vec3 uCyan;
uniform vec2 uSize;
uniform float uRadius;
varying vec2 vUv;
void main() {
  vec2 p = vUv * uSize;
  vec2 corner = vec2(clamp(p.x, uRadius, uSize.x - uRadius), uSize.y - uRadius);
  if (p.y > corner.y && distance(p, corner) > uRadius) discard;
  vec2 q = (vUv - 0.5) * vec2(uSize.x / uSize.y, 1.0);
  vec2 g = q - vec2(-0.3, 0.2);
  vec2 c = q - vec2(0.3, -0.22);
  float gold = exp(-dot(g, g) * 18.0) * 0.3;
  float cyan = exp(-dot(c, c) * 20.0) * 0.24;
  gl_FragColor = vec4(uNavy + uGold * gold + uCyan * cyan, 1.0);
  #include <colorspace_fragment>
}
`;

const CORNER_RADIUS = 16;
const FOV = 20;
const LIFT = 1.4;
const SIZE = 0.31;
const BASE_TURN = 0.3;
const SCROLL_SPIN = 0.001;

function shieldGeometry() {
  const outline = new Shape();
  outline.moveTo(-0.7, 0.72);
  outline.quadraticCurveTo(0, 0.56, 0.7, 0.72);
  outline.lineTo(0.68, 0.05);
  outline.quadraticCurveTo(0.6, -0.55, 0, -0.92);
  outline.quadraticCurveTo(-0.6, -0.55, -0.68, 0.05);
  outline.lineTo(-0.7, 0.72);
  const geometry = new ExtrudeGeometry(outline, {
    depth: 0.1,
    bevelEnabled: true,
    bevelThickness: 0.24,
    bevelSize: 0.16,
    bevelSegments: 12,
    curveSegments: 32,
  });
  geometry.center();
  const position = geometry.getAttribute("position");
  for (let i = 0; i < position.count; i += 1) {
    const x = position.getX(i);
    const y = position.getY(i);
    const z = position.getZ(i);
    position.setZ(i, z + Math.sign(z) * 0.22 * Math.max(0, 1 - x * x - y * y));
  }
  geometry.computeVertexNormals();
  return geometry;
}

function prismGeometry() {
  const geometry = new LatheGeometry(
    [
      new Vector2(0, -1),
      new Vector2(0.62, -0.5),
      new Vector2(0.62, 0.5),
      new Vector2(0, 1),
    ],
    6,
  ).toNonIndexed();
  geometry.rotateZ(0.35);
  geometry.computeVertexNormals();
  return geometry;
}

const SHAPES: Record<
  string,
  { geometry: () => BufferGeometry; tilt: number; phase: number }
> = {
  knot: {
    geometry: () => new TorusKnotGeometry(0.52, 0.17, 220, 32, 2, 3),
    tilt: 0.35,
    phase: 0,
  },
  shield: { geometry: shieldGeometry, tilt: 0.12, phase: -0.35 },
  prism: { geometry: prismGeometry, tilt: 0.5, phase: 0.6 },
};

const createGlass: SceneFactory = async (canvas) => {
  const navy = new Color(paletteColor("--color-ground-dark"));
  const gold = new Color(paletteColor("--color-star-gold"));
  const cyan = new Color(paletteColor("--color-signal-cyan"));
  const paper = new Color(paletteColor("--color-ground-light"));

  const map = await new TextureLoader()
    .loadAsync(media["env.studio"].src)
    .catch(() => {
      throw new Error("glass: the studio map did not load");
    });
  map.mapping = EquirectangularReflectionMapping;
  map.colorSpace = SRGBColorSpace;

  const scene = new Scene();
  const camera = new PerspectiveCamera(FOV, 1, 1, 20000);
  let scroll = Number.NaN;
  let spin = 0;
  let turn = 0;
  let last = 0;

  let loop: ReturnType<typeof createRenderLoop> | undefined;
  let environment: WebGLRenderTarget;
  try {
    loop = createRenderLoop(canvas, {
      onFrame(now) {
        const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
        last = now;
        const rail = canvas.parentElement?.querySelector("[data-rail]");
        const next = window.scrollY + (rail?.scrollLeft ?? 0);
        const delta = Number.isNaN(scroll) ? 0 : next - scroll;
        scroll = next;
        spin +=
          (MathUtils.clamp(delta * SCROLL_SPIN, -0.35, 0.35) - spin) * 0.1;
        turn += dt * BASE_TURN + spin;
        draw();
      },
    });
    loop.renderer.transmissionResolutionScale = 0.5;
    const pmrem = new PMREMGenerator(loop.renderer);
    environment = pmrem.fromEquirectangular(map);
    pmrem.dispose();
  } catch (error) {
    loop?.release();
    throw error;
  } finally {
    map.dispose();
  }
  const { renderer, setRunning, release } = loop;

  scene.environment = environment.texture;
  scene.environmentIntensity = 2;
  scene.environmentRotation.set(-1, Math.PI, 0);

  const rim = new DirectionalLight(gold, 2);
  rim.position.set(-1, 0.6, -1);
  scene.add(rim);

  const glass = new MeshPhysicalMaterial({
    transmission: 1,
    roughness: 0.05,
    thickness: 2,
    ior: 1.5,
    attenuationColor: paper.clone().lerp(cyan, 0.1),
    side: DoubleSide,
  });
  const backdrop = new ShaderMaterial({
    vertexShader: VERTEX,
    fragmentShader: FRAGMENT,
    uniforms: {
      uNavy: { value: navy },
      uGold: { value: gold },
      uCyan: { value: cyan },
      uSize: { value: new Vector2(1, 1) },
      uRadius: { value: CORNER_RADIUS },
    },
  });
  const plane = new PlaneGeometry(1, 1);

  const items = new Map(
    Object.entries(SHAPES).map(([key, { geometry, tilt, phase }]) => {
      const group = new Group();
      const back = new Mesh(plane, backdrop);
      const object = new Mesh(geometry(), glass);
      group.add(back, object);
      group.visible = false;
      scene.add(group);
      return [key, { group, back, object, tilt, phase }];
    }),
  );

  const draw = () => {
    const parent = canvas.parentElement;
    if (!parent) return;
    const box = parent.getBoundingClientRect();
    for (const item of items.values()) item.group.visible = false;
    for (const pane of parent.querySelectorAll<HTMLElement>(
      "[data-card-window]",
    )) {
      const item = items.get(pane.dataset.cardWindow ?? "");
      if (!item) continue;
      const rect = pane.getBoundingClientRect();
      const size = rect.height * SIZE;
      const x = rect.left - box.left + rect.width / 2 - box.width / 2;
      const y = box.height / 2 - (rect.top - box.top + rect.height / 2);
      const lift = size * LIFT;
      const parallax = lift / camera.position.z;
      item.group.position.set(x, y, 0);
      item.back.scale.set(rect.width, rect.height, 1);
      item.object.position.set(-x * parallax, -y * parallax, lift);
      item.object.scale.setScalar(size);
      item.object.rotation.set(
        item.tilt + Math.sin(turn * 0.4 + item.phase) * 0.12,
        turn + item.phase,
        0,
      );
      backdrop.uniforms.uSize.value.set(rect.width, rect.height);
      glass.attenuationDistance = size * 2.5;
      item.group.visible = true;
    }
    renderer.render(scene, camera);
  };

  return {
    setRunning,
    resize(w, h) {
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.position.z = h / 2 / Math.tan(MathUtils.degToRad(FOV / 2));
      camera.updateProjectionMatrix();
      draw();
    },
    dispose() {
      for (const { object } of items.values()) object.geometry.dispose();
      plane.dispose();
      glass.dispose();
      backdrop.dispose();
      environment.dispose();
      release();
    },
  };
};

export default createGlass;
