"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useReducedMotion } from "motion/react";
import { Color, Mesh, Program, Renderer, Triangle, Vec2 } from "ogl";
import { useEffectsPaused } from "@/lib/effects-pause";

export const HERO_SHADER_VERTEX = `attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0.0, 1.0);
}
`;

export const HERO_SHADER_FRAGMENT = `#ifdef GL_FRAGMENT_PRECISION_HIGH
precision highp float;
#else
precision mediump float;
#endif

uniform float uTime;
uniform vec2 uResolution;
uniform vec2 uPosition;
uniform vec3 uAccentColor;
uniform vec3 uBackgroundColor;
uniform float uZoom;
uniform float uTimeAmplitude;

varying vec2 vUv;

float hash(vec2 p) {
  return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453123);
}

float valueNoise(vec2 p) {
  vec2 cell = floor(p);
  vec2 f = fract(p);
  vec2 w = f * f * (3.0 - 2.0 * f);
  float a = hash(cell);
  float b = hash(cell + vec2(1.0, 0.0));
  float c = hash(cell + vec2(0.0, 1.0));
  float d = hash(cell + vec2(1.0, 1.0));
  return mix(mix(a, b, w.x), mix(c, d, w.x), w.y);
}

float fbm(vec2 p, float phase) {
  mat2 rot = mat2(0.80, 0.60, -0.60, 0.80);
  float sum = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 3; i++) {
    sum += amp * valueNoise(p + phase * float(i + 1));
    p = rot * p * 2.03;
    amp *= 0.5;
  }
  return sum;
}

void main() {
  vec2 p = (vUv - 0.5) * vec2(1.0, uResolution.y);
  p = (p - uPosition) / uZoom;

  vec2 warp = vec2(
    fbm(p + uTime, uTimeAmplitude),
    fbm(p - uTime + 4.7, uTimeAmplitude)
  );
  float field = fbm(p + 1.2 * warp, uTimeAmplitude);

  float radial = 1.0 - clamp(length(p) * 0.55, 0.0, 1.0);
  float amount = smoothstep(0.10, 0.92, field * 0.85 + radial * 0.55 - 0.18);

  vec3 color = mix(uBackgroundColor, uAccentColor, amount * 0.45);

  // 1/255 hash dither: the ramp between two near-black stops bands without it.
  float dither = (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  gl_FragColor = vec4(color + dither, 1.0);
}
`;

export const HERO_SHADER_CONSTANTS = {
  uPosition: [0.1, -0.15],
  uZoom: 0.35,
  uTimeAmplitude: 0.015,
} as const;

const STAGE_DURATION_FALLBACK_MS = 900;

type Rgb = [number, number, number];

type SchemeColors = { accent: Rgb; surface: Rgb };

type HeroShaderUniforms = {
  uTime: { value: number };
  uResolution: { value: Vec2 };
  uPosition: { value: Vec2 };
  uAccentColor: { value: Color };
  uBackgroundColor: { value: Color };
  uZoom: { value: number };
  uTimeAmplitude: { value: number };
};

type Fade = {
  from: SchemeColors;
  to: SchemeColors;
  start: number;
  duration: number;
};

const subscribeNothing = () => () => {};
const subscribeVisibility = (onChange: () => void) => {
  document.addEventListener("visibilitychange", onChange);
  return () => document.removeEventListener("visibilitychange", onChange);
};

function probeWebGL(): boolean {
  if (typeof document === "undefined") return false;
  const canvas = document.createElement("canvas");
  try {
    const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
    if (!gl) return false;

    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return true;
  } catch {
    return false;
  }
}

function parseRgb(value: string): Rgb {
  const numbers = value.match(/-?\d*\.?\d+/g) ?? [];
  const scale = value.startsWith("color(") ? 1 : 255;
  return [
    Number(numbers[0] ?? 0) / scale,
    Number(numbers[1] ?? 0) / scale,
    Number(numbers[2] ?? 0) / scale,
  ];
}

function readSchemeColors(probe: HTMLElement): SchemeColors {
  const style = getComputedStyle(probe);
  return {
    accent: parseRgb(style.color),
    surface: parseRgb(style.backgroundColor),
  };
}

function readStageDuration(probe: HTMLElement): number {
  const raw = getComputedStyle(probe)
    .getPropertyValue("--duration-stage")
    .trim();
  const value = Number.parseFloat(raw);
  if (!raw || Number.isNaN(value)) return STAGE_DURATION_FALLBACK_MS;
  if (raw.endsWith("ms")) return value;
  if (raw.endsWith("s")) return value * 1000;
  return value;
}

function mixRgb(from: Rgb, to: Rgb, t: number): Rgb {
  return [
    from[0] + (to[0] - from[0]) * t,
    from[1] + (to[1] - from[1]) * t,
    from[2] + (to[2] - from[2]) * t,
  ];
}

export function HeroShader() {
  const reduced = useReducedMotion();
  const paused = useEffectsPaused();
  const [onscreen, setOnscreen] = useState(true);
  const [contextLost, setContextLost] = useState(false);
  const [generation, setGeneration] = useState(0);
  const [contextAvailable] = useState(probeWebGL);

  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const schemeProbeRef = useRef<HTMLSpanElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const programRef = useRef<Program | null>(null);
  const meshRef = useRef<Mesh | null>(null);
  const uniformsRef = useRef<HeroShaderUniforms | null>(null);
  const startRef = useRef(0);
  const fadeRef = useRef<Fade | null>(null);

  const mounted = useSyncExternalStore(
    subscribeNothing,
    () => true,
    () => false,
  );

  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    () => !document.hidden,
    () => true,
  );

  useEffect(() => {
    const node = rootRef.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      ([entry]) => setOnscreen(entry?.isIntersecting ?? true),
      { threshold: 0.15 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [mounted, generation]);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const probe = schemeProbeRef.current;
    if (!root || !canvas || !probe) return;

    const renderer = new Renderer({
      canvas,
      dpr: 1,
      alpha: false,
      depth: false,
      stencil: false,
      antialias: false,
      powerPreference: "low-power",
    });
    const gl = renderer.gl;

    const uniforms: HeroShaderUniforms = {
      uTime: { value: 0 },
      uResolution: { value: new Vec2(1, 1) },
      uPosition: { value: new Vec2(...HERO_SHADER_CONSTANTS.uPosition) },
      uAccentColor: { value: new Color(0, 0, 0) },
      uBackgroundColor: { value: new Color(0, 0, 0) },
      uZoom: { value: HERO_SHADER_CONSTANTS.uZoom },
      uTimeAmplitude: { value: HERO_SHADER_CONSTANTS.uTimeAmplitude },
    };
    uniformsRef.current = uniforms;

    const program = new Program(gl, {
      vertex: HERO_SHADER_VERTEX,
      fragment: HERO_SHADER_FRAGMENT,
      uniforms,
      depthTest: false,
      depthWrite: false,
    });
    const mesh = new Mesh(gl, { geometry: new Triangle(gl), program });

    rendererRef.current = renderer;
    programRef.current = program;
    meshRef.current = mesh;
    startRef.current = performance.now();
    fadeRef.current = null;

    probe.style.color = "var(--scheme-accent)";
    probe.style.backgroundColor = "var(--scheme-surface)";
    const initial = readSchemeColors(probe);
    uniforms.uAccentColor.value.set(...initial.accent);
    uniforms.uBackgroundColor.value.set(...initial.surface);

    const resize = () => {
      const bounds = root.getBoundingClientRect();
      const width = Math.max(1, Math.round(bounds.width));
      const height = Math.max(1, Math.round(bounds.height));
      renderer.setSize(width, height);
      uniforms.uResolution.value.set(1, height / width);
    };

    resize();
    renderer.render({ scene: mesh });

    let stopResize: () => void;
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", resize);
      stopResize = () => window.removeEventListener("resize", resize);
    } else {
      const observer = new ResizeObserver(resize);
      observer.observe(root);
      stopResize = () => observer.disconnect();
    }

    const onLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const onRestored = () => {
      setContextLost(false);
      setGeneration((g) => g + 1);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    return () => {
      stopResize();
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      program.remove();
      mesh.geometry.remove();
      gl.getExtension("WEBGL_lose_context")?.loseContext();
      rendererRef.current = null;
      programRef.current = null;
      meshRef.current = null;
      uniformsRef.current = null;
      fadeRef.current = null;
    };
  }, [mounted, generation]);

  useEffect(() => {
    const root = rootRef.current;
    const probe = schemeProbeRef.current;
    if (!root || !probe || typeof MutationObserver === "undefined") return;
    const band = root.closest("[data-scheme]");
    if (!band) return;

    const observer = new MutationObserver(() => {
      const uniforms = uniformsRef.current;
      if (!uniforms) return;
      const accent = uniforms.uAccentColor.value;
      const surface = uniforms.uBackgroundColor.value;
      fadeRef.current = {
        from: {
          accent: [accent[0], accent[1], accent[2]],
          surface: [surface[0], surface[1], surface[2]],
        },
        to: readSchemeColors(probe),
        start: performance.now(),
        duration: readStageDuration(probe),
      };
    });
    observer.observe(band, {
      attributes: true,
      attributeFilter: ["data-scheme"],
    });
    return () => observer.disconnect();
  }, [mounted, generation]);

  const running = !paused && onscreen && tabVisible;

  useEffect(() => {
    if (!running || contextLost) return;
    const renderer = rendererRef.current;
    const mesh = meshRef.current;
    const uniforms = uniformsRef.current;
    if (!renderer || !mesh || !uniforms) return;

    let frame = 0;
    const step = (now: number) => {
      uniforms.uTime.value =
        ((now - startRef.current) / 1000) *
        HERO_SHADER_CONSTANTS.uTimeAmplitude;

      const fade = fadeRef.current;
      if (fade) {
        const t = Math.min(Math.max((now - fade.start) / fade.duration, 0), 1);
        uniforms.uAccentColor.value.set(
          ...mixRgb(fade.from.accent, fade.to.accent, t),
        );
        uniforms.uBackgroundColor.value.set(
          ...mixRgb(fade.from.surface, fade.to.surface, t),
        );
        if (t >= 1) fadeRef.current = null;
      }

      renderer.render({ scene: mesh });
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [running, mounted, generation, contextLost]);

  if (!mounted || reduced || !contextAvailable || contextLost) return null;

  return (
    <div
      ref={rootRef}
      aria-hidden
      data-hero-shader
      data-running={running}
      data-paused={paused}
      className="pointer-events-none absolute inset-0 -z-20"
    >
      <canvas ref={canvasRef} aria-hidden className="block h-full w-full" />
      <span ref={schemeProbeRef} aria-hidden className="hidden" />
    </div>
  );
}
