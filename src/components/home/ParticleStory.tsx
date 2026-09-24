"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

/** loading → sit → open → hold → explode → converge → bloom → paths */
type StoryPhase =
  | "loading"
  | "sit"
  | "open"
  | "hold"
  | "explode"
  | "converge"
  | "bloom"
  | "paths";

const IMG_CLOSED = "/images/moon-boy-gift-closed.png";
const IMG_OPEN = "/images/moon-boy-gift-open.png";
const IMG_ROSE = "/images/rose-particle.png";
/** 星图航线入口：与 journey 地球同源资源 */
const IMG_ENTRY_JOURNEY = "/images/earth-blue-marble.jpg";
/** 月光信局入口：星云图标 */
const IMG_ENTRY_LETTERS = "/images/nebula-icon.png";

/** 共用屏幕锚点：男孩图 / 玫瑰 / 花心 */
const ANCHOR_X = 0.42;
const ANCHOR_Y = 0.5;
const BOY_HEIGHT_RATIO = 0.62;
const ROSE_HEIGHT_RATIO = 0.55;

const SIT_MS = 2200;
const OPEN_FADE_MS = 700;
const OPEN_DWELL_MS = 400;
const OPEN_TOTAL_MS = OPEN_FADE_MS + OPEN_DWELL_MS;
const HOLD_MS = 700;

// —— explode 可调 ——
const EXPLODE_MS = 2200;
const EXPLODE_IMG_FADE_MS = 300;
const EXPLODE_PARTICLE_DESKTOP = 900;
const EXPLODE_PARTICLE_MOBILE = 400;
const EXPLODE_SPEED_MIN = 3;
const EXPLODE_SPEED_MAX = 7;
const EXPLODE_DRAG = 0.96;
const EXPLODE_ALPHA_MIN = 30;
const EXPLODE_DOT_MIN = 1.5;
const EXPLODE_DOT_MAX = 2.5;
const EXPLODE_TANGENTIAL = 4;

// —— converge 可调（玫瑰汇聚）——
const CONVERGE_PARTICLE_DESKTOP = 4000;
const CONVERGE_PARTICLE_MOBILE = 1500;
const CONVERGE_DARK_DESKTOP = 1200;
const CONVERGE_DARK_MOBILE = 450;
const CONVERGE_BUCKET_COUNT = 8;
const CONVERGE_BUCKET_GAP_MS = 150;
const CONVERGE_BIRTH_JITTER_MS = 100;
const CONVERGE_PARTICLE_MS = 1600;
const CONVERGE_ARC_AMP = 0.05;
const CONVERGE_DOT_MIN = 2;
const CONVERGE_DOT_MAX = 3;
const CONVERGE_DRAW_ALPHA = 0.9;
const CONVERGE_DARK_ALPHA_SCALE = 0.55;
const SAMPLE_ALPHA_MIN = 30;
/** 亮星 >100；暗星 60~100 作花瓣填充 */
const ROSE_STAR_LUMA_MIN = 100;
const ROSE_DARK_LUMA_MIN = 60;
const PLUM_R = 90;
const PLUM_G = 40;
const PLUM_B = 110;
const PLUM_MIX = 0.25;

// —— paths 可调（宽带星群）——
const BLOOM_TO_PATHS_MS = 500;
const PATHS_DRAW_MS = 1600;
const PATHS_TO_ENTRIES_MS = 500;
const PATH_CORE_DESKTOP = 110;
const PATH_CORE_MOBILE = 70;
const PATH_STAGGER_MS = 20;
const PATH_BAND_WIDTH = 22;
const PATH_SIDE_COUNT = 4;
const PATH_COOL = { r: 230, g: 220, b: 255 } as const;
const PATH_WARM = { r: 255, g: 215, b: 150 } as const;

const FRAME_MS = 1000 / 60;
const GOLD_R = 255;
const GOLD_G = 248;
const GOLD_B = 220;
const HOME_STORY_PLAYED_KEY = "homeStoryPlayed";
/**
 * 开发调试：true = 每次强制播放（忽略 sessionStorage / reduced-motion）
 * 验证完动画后改回 false
 */
const FORCE_PLAY_HOME_STORY = false;

function readHomeStoryPlayedFlag(): string | null {
  try {
    return sessionStorage.getItem(HOME_STORY_PLAYED_KEY);
  } catch {
    return null;
  }
}

function markHomeStoryPlayed(reason: string) {
  console.log(
    "[ParticleStory] markHomeStoryPlayed → writing sessionStorage",
    { reason, key: HOME_STORY_PLAYED_KEY },
  );
  try {
    sessionStorage.setItem(HOME_STORY_PLAYED_KEY, "1");
  } catch {
    /* private mode 等忽略 */
  }
}

function shouldSkipHomeStory(): {
  skip: boolean;
  reason: string;
  flag: string | null;
  reducedMotion: boolean;
} {
  const flag = readHomeStoryPlayedFlag();
  let reducedMotion = false;
  try {
    reducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  } catch {
    reducedMotion = false;
  }

  if (FORCE_PLAY_HOME_STORY) {
    return {
      skip: false,
      reason: "FORCE_PLAY_HOME_STORY",
      flag,
      reducedMotion,
    };
  }
  if (reducedMotion) {
    return { skip: true, reason: "prefers-reduced-motion", flag, reducedMotion };
  }
  if (flag === "1") {
    return { skip: true, reason: "sessionStorage homeStoryPlayed", flag, reducedMotion };
  }
  return { skip: false, reason: "play", flag, reducedMotion };
}

function deferHeavyWork(fn: () => void) {
  if (typeof window.requestIdleCallback === "function") {
    window.requestIdleCallback(() => fn(), { timeout: 480 });
  } else {
    window.setTimeout(fn, 0);
  }
}

function explodeAlphaFactor(p: number) {
  const x = Math.min(1, Math.max(0, p));
  if (x < 0.4) return 1;
  const t = (x - 0.4) / 0.6;
  const s = t * t * (3 - 2 * t);
  return 1 - s;
}

function smoothstep(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x * x * (3 - 2 * x);
}

function easeOutQuart(t: number) {
  const x = 1 - Math.min(1, Math.max(0, t));
  return 1 - x * x * x * x;
}

function easeInOutQuad(t: number) {
  const x = Math.min(1, Math.max(0, t));
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2;
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

type Vec2 = { x: number; y: number };

type StarPathDef = {
  start: Vec2;
  cp: Vec2;
  end: Vec2;
};

type PathDustPoint = {
  x: number;
  y: number;
  /** 曲线参数 0→1（亮度渐变用） */
  t: number;
  phase: number;
  size: number;
  /** 相对 paths 阶段起点的点亮时刻 */
  birth: number;
  /** 相对路径亮度的 alpha 倍率（核心 0.95；侧星再乘高斯衰减） */
  alphaMul: number;
  r: number;
  g: number;
  b: number;
};

type PathDustBundle = {
  end: Vec2;
  /** 各核心点的 birth，用于终点亮星时机 */
  endBirth: number;
  dust: PathDustPoint[];
};

function quadPoint(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const u = 1 - t;
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y,
  };
}

/** 二次贝塞尔切线单位向量 */
function quadTangent(p0: Vec2, p1: Vec2, p2: Vec2, t: number): Vec2 {
  const tx = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x);
  const ty = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y);
  const len = Math.hypot(tx, ty) || 1;
  return { x: tx / len, y: ty / len };
}

function gaussRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

function pickPathColor() {
  return Math.random() < 0.85 ? PATH_COOL : PATH_WARM;
}

/** 入口/终点 0.72w；以 0.48h 为轴上下镜像 */
function buildStarPaths(w: number, h: number, _mobile: boolean): StarPathDef[] {
  return [
    {
      start: { x: 0.56 * w, y: 0.4 * h },
      cp: { x: 0.64 * w, y: 0.24 * h },
      end: { x: 0.72 * w, y: 0.31 * h },
    },
    {
      start: { x: 0.56 * w, y: 0.56 * h },
      cp: { x: 0.64 * w, y: 0.72 * h },
      end: { x: 0.72 * w, y: 0.65 * h },
    },
  ];
}

function buildPathDust(path: StarPathDef, coreCount: number): PathDustPoint[] {
  const n = Math.max(2, coreCount);
  const sigma = PATH_BAND_WIDTH / 2.2;
  const out: PathDustPoint[] = [];

  for (let i = 0; i < n; i += 1) {
    const t = i / (n - 1);
    const pt = quadPoint(path.start, path.cp, path.end, t);
    const tan = quadTangent(path.start, path.cp, path.end, t);
    const nx = -tan.y;
    const ny = tan.x;
    const birth = Math.min(i * PATH_STAGGER_MS, PATHS_DRAW_MS);

    const coreColor = pickPathColor();
    out.push({
      x: pt.x,
      y: pt.y,
      t,
      phase: Math.random() * Math.PI * 2,
      size: 1.4 + Math.random() * 0.8,
      birth,
      alphaMul: 0.95,
      r: coreColor.r,
      g: coreColor.g,
      b: coreColor.b,
    });

    for (let s = 0; s < PATH_SIDE_COUNT; s += 1) {
      const offset = gaussRandom() * sigma;
      const falloff = Math.exp(
        -Math.pow(offset / PATH_BAND_WIDTH, 2) * 2.2,
      );
      const sideColor = pickPathColor();
      out.push({
        x: pt.x + nx * offset,
        y: pt.y + ny * offset,
        t,
        phase: Math.random() * Math.PI * 2,
        size: 0.6 + Math.random() * 1.2,
        birth,
        alphaMul: 0.95 * falloff * (0.5 + Math.random() * 0.5),
        r: sideColor.r,
        g: sideColor.g,
        b: sideColor.b,
      });
    }
  }

  return out;
}

function buildPathDustBundles(
  w: number,
  h: number,
  mobile: boolean,
): PathDustBundle[] {
  const count = mobile ? PATH_CORE_MOBILE : PATH_CORE_DESKTOP;
  return buildStarPaths(w, h, mobile).map((path) => {
    const dust = buildPathDust(path, count);
    const endBirth = Math.min((count - 1) * PATH_STAGGER_MS, PATHS_DRAW_MS);
    return {
      end: { ...path.end },
      endBirth,
      dust,
    };
  });
}

function drawSoftStar(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  r: number,
  g: number,
  b: number,
  alpha: number,
) {
  if (alpha <= 0.01) return;
  const glowR = size * 2.4;
  const gradient = ctx.createRadialGradient(x, y, 0, x, y, glowR);
  gradient.addColorStop(0, `rgba(${r},${g},${b},${alpha})`);
  gradient.addColorStop(0.4, `rgba(${r},${g},${b},${alpha * 0.35})`);
  gradient.addColorStop(1, `rgba(${r},${g},${b},0)`);
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(x, y, glowR, 0, Math.PI * 2);
  ctx.fill();
}

function drawPathDustBundle(
  ctx: CanvasRenderingContext2D,
  bundle: PathDustBundle,
  elapsed: number,
  now: number,
) {
  const prevComp = ctx.globalCompositeOperation;
  const prevAlpha = ctx.globalAlpha;
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 1;

  for (const d of bundle.dust) {
    if (elapsed < d.birth) continue;
    // 沿曲线亮度 0.5 → 1.0，再叠 ±30% 正弦微闪
    const along = 0.5 + 0.5 * d.t;
    const twinkle = 1 + Math.sin(now * 0.003 + d.phase) * 0.3;
    const alpha = Math.min(1, Math.max(0, along * d.alphaMul * twinkle));
    drawSoftStar(ctx, d.x, d.y, d.size, d.r, d.g, d.b, alpha);
  }

  if (elapsed >= bundle.endBirth) {
    const { x, y } = bundle.end;
    const twinkle = 1 + Math.sin(now * 0.0028 + 1.7) * 0.25;
    const alpha = Math.min(1, Math.max(0.55, twinkle));
    const glowR = 12;
    const glow = ctx.createRadialGradient(x, y, 0, x, y, glowR);
    glow.addColorStop(0, `rgba(255, 248, 240, ${0.85 * alpha})`);
    glow.addColorStop(
      0.35,
      `rgba(${PATH_COOL.r},${PATH_COOL.g},${PATH_COOL.b},${0.5 * alpha})`,
    );
    glow.addColorStop(
      1,
      `rgba(${PATH_COOL.r},${PATH_COOL.g},${PATH_COOL.b},0)`,
    );
    ctx.fillStyle = glow;
    ctx.beginPath();
    ctx.arc(x, y, glowR, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255, 252, 255, ${alpha})`;
    ctx.beginPath();
    ctx.arc(x, y, 3, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.globalCompositeOperation = prevComp;
  ctx.globalAlpha = prevAlpha;
}

/** 向深李紫混合 25%，保留明暗与色相差异 */
function mixDeepPlum(r: number, g: number, b: number) {
  return {
    r: Math.round(r * (1 - PLUM_MIX) + PLUM_R * PLUM_MIX),
    g: Math.round(g * (1 - PLUM_MIX) + PLUM_G * PLUM_MIX),
    b: Math.round(b * (1 - PLUM_MIX) + PLUM_B * PLUM_MIX),
  };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.decoding = "async";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

type Layout = {
  x: number;
  y: number;
  w: number;
  h: number;
  cx: number;
  cy: number;
};

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  g: number;
  b: number;
  a0: number;
  size: number;
  isHeart: boolean;
};

type RoseTarget = {
  x: number;
  y: number;
  r: number;
  g: number;
  b: number;
  dist: number;
  /** 相对亮星的 alpha 倍率（暗星 0.55） */
  aScale: number;
};

type ConvergeParticle = {
  sx: number;
  sy: number;
  tx: number;
  ty: number;
  tr: number;
  tg: number;
  tb: number;
  size: number;
  birth: number;
  breathPhase: number;
  aScale: number;
};

type FlowerHeart = {
  x: number;
  y: number;
};

/** 共用定位：中心 (ANCHOR_X, ANCHOR_Y)，高度 = heightRatio × 画布高 */
function layoutForImage(
  img: HTMLImageElement,
  viewW: number,
  viewH: number,
  heightRatio: number,
): Layout {
  const h = viewH * heightRatio;
  const w = h * (img.naturalWidth / Math.max(1, img.naturalHeight));
  const cx = viewW * ANCHOR_X;
  const cy = viewH * ANCHOR_Y;
  return {
    x: cx - w * 0.5,
    y: cy - h * 0.5,
    w,
    h,
    cx,
    cy,
  };
}

function drawGlow(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  intensity: number,
) {
  if (intensity <= 0.001) return;
  const prev = ctx.globalCompositeOperation;
  ctx.globalCompositeOperation = "lighter";
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  const a = Math.min(1, intensity);
  gradient.addColorStop(0, `rgba(255, 215, 140, ${a})`);
  gradient.addColorStop(0.45, `rgba(255, 215, 140, ${a * 0.35})`);
  gradient.addColorStop(1, "rgba(255, 215, 140, 0)");
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(cx, cy, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalCompositeOperation = prev;
}

function sampleOpaquePoints(
  img: HTMLImageElement,
  layout: Layout,
  targetCount: number,
): Array<{ x: number; y: number; r: number; g: number; b: number; a0: number }> {
  const ow = Math.max(1, Math.round(layout.w));
  const oh = Math.max(1, Math.round(layout.h));
  const offscreen = document.createElement("canvas");
  offscreen.width = ow;
  offscreen.height = oh;
  const octx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!octx) return [];

  octx.clearRect(0, 0, ow, oh);
  octx.drawImage(img, 0, 0, ow, oh);
  const { data, width, height } = octx.getImageData(0, 0, ow, oh);

  let stride = Math.max(
    1,
    Math.floor(Math.sqrt((width * height) / Math.max(1, targetCount * 2.2))),
  );

  const collect = (step: number) => {
    const list: Array<{
      x: number;
      y: number;
      r: number;
      g: number;
      b: number;
      a0: number;
    }> = [];
    for (let py = 0; py < height; py += step) {
      for (let px = 0; px < width; px += step) {
        const i = (py * width + px) * 4;
        const alpha = data[i + 3];
        if (alpha <= SAMPLE_ALPHA_MIN) continue;
        const scaleX = layout.w / width;
        const scaleY = layout.h / height;
        list.push({
          x: layout.x + (px + 0.5) * scaleX,
          y: layout.y + (py + 0.5) * scaleY,
          r: data[i],
          g: data[i + 1],
          b: data[i + 2],
          a0: alpha / 255,
        });
      }
    }
    return list;
  };

  let points = collect(stride);
  while (points.length < targetCount * 0.65 && stride > 1) {
    stride -= 1;
    points = collect(stride);
  }

  if (points.length > targetCount) {
    const picked: typeof points = [];
    const step = points.length / targetCount;
    for (let i = 0; i < targetCount; i += 1) {
      picked.push(points[Math.floor(i * step)]!);
    }
    points = picked;
  }

  return points;
}

function sampleParticlesFromOpen(
  img: HTMLImageElement,
  layout: Layout,
  targetCount: number,
): Particle[] {
  return sampleOpaquePoints(img, layout, targetCount).map((p) => ({
    x: p.x,
    y: p.y,
    vx: 0,
    vy: 0,
    r: p.r,
    g: p.g,
    b: p.b,
    a0: p.a0,
    size:
      EXPLODE_DOT_MIN + Math.random() * (EXPLODE_DOT_MAX - EXPLODE_DOT_MIN),
    isHeart: false,
  }));
}

function sampleRoseTargets(
  img: HTMLImageElement,
  layout: Layout,
  targetCount: number,
  lumaMin: number,
  lumaMax: number,
  aScale: number,
): RoseTarget[] {
  const ow = Math.max(1, Math.round(layout.w));
  const oh = Math.max(1, Math.round(layout.h));
  const offscreen = document.createElement("canvas");
  offscreen.width = ow;
  offscreen.height = oh;
  const octx = offscreen.getContext("2d", { willReadFrequently: true });
  if (!octx) return [];

  octx.clearRect(0, 0, ow, oh);
  octx.drawImage(img, 0, 0, ow, oh);
  const { data, width, height } = octx.getImageData(0, 0, ow, oh);

  let stride = Math.max(
    1,
    Math.floor(Math.sqrt((width * height) / Math.max(1, targetCount * 2.2))),
  );

  const collect = (step: number) => {
    const list: RoseTarget[] = [];
    for (let py = 0; py < height; py += step) {
      for (let px = 0; px < width; px += step) {
        const i = (py * width + px) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const alpha = data[i + 3];
        if (alpha <= SAMPLE_ALPHA_MIN) continue;
        const luma = Math.max(r, g, b);
        if (luma < lumaMin || luma > lumaMax) continue;
        const scaleX = layout.w / width;
        const scaleY = layout.h / height;
        const x = layout.x + (px + 0.5) * scaleX;
        const y = layout.y + (py + 0.5) * scaleY;
        const mixed = mixDeepPlum(r, g, b);
        list.push({
          x,
          y,
          r: mixed.r,
          g: mixed.g,
          b: mixed.b,
          dist: Math.hypot(x - layout.cx, y - layout.cy),
          aScale,
        });
      }
    }
    return list;
  };

  let points = collect(stride);
  while (points.length < targetCount * 0.65 && stride > 1) {
    stride -= 1;
    points = collect(stride);
  }

  if (points.length > targetCount) {
    const picked: RoseTarget[] = [];
    const step = points.length / targetCount;
    for (let i = 0; i < targetCount; i += 1) {
      picked.push(points[Math.floor(i * step)]!);
    }
    points = picked;
  }

  return points;
}

function assignExplosionVelocities(particles: Particle[], layout: Layout) {
  const { cx, cy } = layout;
  for (const p of particles) {
    if (p.isHeart) {
      p.vx = 0;
      p.vy = 0;
      continue;
    }
    const dx = p.x - cx;
    const dy = p.y - cy;
    const len = Math.hypot(dx, dy) || 1;
    const nx = dx / len;
    const ny = dy / len;
    const speed =
      EXPLODE_SPEED_MIN +
      Math.random() * (EXPLODE_SPEED_MAX - EXPLODE_SPEED_MIN);
    const tx = -ny;
    const ty = nx;
    const tang = (Math.random() - 0.5) * EXPLODE_TANGENTIAL;
    p.vx = nx * speed + tx * tang;
    p.vy = ny * speed + ty * tang;
  }
}

/**
 * 就近优先分配；目标多于爆炸粒子时允许复用起点（随机抽取）
 */
function buildConvergeParticles(
  explodeParticles: Particle[],
  targets: RoseTarget[],
): ConvergeParticle[] {
  const movers = explodeParticles.filter((p) => !p.isHeart);
  if (movers.length === 0) return [];

  // 保留调用方顺序：亮星（已按 dist）在前 → 内圈批次；暗星在后 → 外圈批次
  const orderedTargets = targets;
  const used = new Set<number>();
  const result: ConvergeParticle[] = [];
  const n = orderedTargets.length;
  const bucketSize = Math.max(1, Math.ceil(n / CONVERGE_BUCKET_COUNT));

  const pickStart = (t: RoseTarget) => {
    let best = -1;
    let bestD = Infinity;
    for (let i = 0; i < movers.length; i += 1) {
      if (used.has(i)) continue;
      const m = movers[i]!;
      const d = Math.hypot(m.x - t.x, m.y - t.y);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    if (best >= 0) {
      used.add(best);
      return movers[best]!;
    }
    // 余烬复用：随机一个爆炸粒子作起点
    return movers[Math.floor(Math.random() * movers.length)]!;
  };

  for (let ti = 0; ti < n; ti += 1) {
    const t = orderedTargets[ti]!;
    const m = pickStart(t);
    const bucket = Math.floor(ti / bucketSize);
    const birth =
      bucket * CONVERGE_BUCKET_GAP_MS +
      Math.random() * CONVERGE_BIRTH_JITTER_MS;
    result.push({
      sx: m.x,
      sy: m.y,
      tx: t.x,
      ty: t.y,
      tr: t.r,
      tg: t.g,
      tb: t.b,
      size:
        CONVERGE_DOT_MIN +
        Math.random() * (CONVERGE_DOT_MAX - CONVERGE_DOT_MIN),
      birth,
      breathPhase: Math.random() * Math.PI * 2,
      aScale: t.aScale,
    });
  }

  return result;
}

/**
 * 首页粒子叙事：sit → open → hold → explode → converge → bloom → paths
 * 健壮性：异常/减动效/已播过 → 停 rAF + 单次绘制最终态；素材失败 → 仅 HTML 入口
 */
export default function ParticleStory() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [pathEntries, setPathEntries] = useState<{
    show: boolean;
    mobile: boolean;
    journey: Vec2;
    letters: Vec2;
    instant: boolean;
  }>({
    show: false,
    mobile: false,
    journey: { x: 0, y: 0 },
    letters: { x: 0, y: 0 },
    instant: false,
  });
  const entriesShownRef = useRef(false);
  /** StrictMode 双挂载：只认最新一代 effect */
  const bootGenRef = useRef(0);

  useEffect(() => {
    const bootGen = ++bootGenRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let frameId = 0;
    let disposed = false;
    const isStale = () => disposed || bootGen !== bootGenRef.current;
    let animating = false;
    /** 最终态冻结：停 rAF，仅 resize 时重绘一次 */
    let staticFrozen = false;
    /** 仅 HTML 入口（无 canvas 玫瑰/星带） */
    let htmlOnly = false;
    let viewW = window.innerWidth;
    let viewH = window.innerHeight;
    let lastTs = 0;

    let phase: StoryPhase = "loading";
    let phaseStartedAt = 0;
    let closedImg: HTMLImageElement | null = null;
    let openImg: HTMLImageElement | null = null;
    let roseImg: HTMLImageElement | null = null;

    let particles: Particle[] = [];
    let convergeParticles: ConvergeParticle[] = [];
    let flowerHeart: FlowerHeart | null = null;
    let explodeSettled = false;
    let pathDustBundles: PathDustBundle[] | null = null;

    const stopRaf = () => {
      animating = false;
      if (frameId) {
        window.cancelAnimationFrame(frameId);
        frameId = 0;
      }
    };

    const rebuildPathDust = () => {
      const mobile = viewW < 768;
      pathDustBundles = buildPathDustBundles(viewW, viewH, mobile);
      return { mobile, bundles: pathDustBundles };
    };

    const showHtmlEntries = (instant: boolean) => {
      entriesShownRef.current = true;
      const mobile = viewW < 768;
      const ends =
        pathDustBundles ??
        buildStarPaths(viewW, viewH, mobile).map((p) => ({ end: p.end }));
      const journey = ends[0]!.end;
      const letters = ends[1]!.end;
      setPathEntries({
        show: true,
        mobile,
        journey: { ...journey },
        letters: { ...letters },
        instant,
      });
    };

    /** 在目标点定格的玫瑰粒子（跳过/回放最终态用；不阻塞调用方） */
    const buildStaticRoseConverge = () => {
      if (!roseImg) return;
      const mobile = viewW < 768;
      const brightCount = mobile
        ? CONVERGE_PARTICLE_MOBILE
        : CONVERGE_PARTICLE_DESKTOP;
      const darkCount = mobile ? CONVERGE_DARK_MOBILE : CONVERGE_DARK_DESKTOP;
      const roseLayout = layoutForImage(
        roseImg,
        viewW,
        viewH,
        ROSE_HEIGHT_RATIO,
      );
      flowerHeart = { x: roseLayout.cx, y: roseLayout.cy };
      canvas.dataset.flowerHeartX = String(roseLayout.cx);
      canvas.dataset.flowerHeartY = String(roseLayout.cy);

      const bright = sampleRoseTargets(
        roseImg,
        roseLayout,
        brightCount,
        ROSE_STAR_LUMA_MIN,
        255,
        1,
      );
      const dark = sampleRoseTargets(
        roseImg,
        roseLayout,
        darkCount,
        ROSE_DARK_LUMA_MIN,
        ROSE_STAR_LUMA_MIN,
        CONVERGE_DARK_ALPHA_SCALE,
      );
      const targets = [...bright, ...dark];
      convergeParticles = targets.map((t) => ({
        sx: t.x,
        sy: t.y,
        tx: t.x,
        ty: t.y,
        tr: t.r,
        tg: t.g,
        tb: t.b,
        size:
          CONVERGE_DOT_MIN +
          Math.random() * (CONVERGE_DOT_MAX - CONVERGE_DOT_MIN),
        birth: 0,
        breathPhase: Math.random() * Math.PI * 2,
        aScale: t.aScale,
      }));
    };

    const paintFinalOnce = () => {
      const now = performance.now();
      ctx.clearRect(0, 0, viewW, viewH);
      if (htmlOnly) return;

      if (convergeParticles.length > 0) {
        drawConvergeOrBloom(1e9, true, now);
      }
      if (!pathDustBundles) rebuildPathDust();
      if (pathDustBundles) {
        for (const bundle of pathDustBundles) {
          drawPathDustBundle(ctx, bundle, PATHS_DRAW_MS + 2000, now);
        }
      }
    };

    const ensureFinalCanvasData = () => {
      if (!roseImg) return false;
      if (convergeParticles.length === 0) {
        buildStaticRoseConverge();
      }
      rebuildPathDust();
      return convergeParticles.length > 0;
    };

    /** 停循环 + 单次绘制最终态 + 显示 HTML 入口（rAF 不再跑）
     * 默认不写 sessionStorage；仅动画完整播完才 mark */
    const enterFinalStatic = (opts?: {
      instant?: boolean;
      markPlayed?: boolean;
    }) => {
      const instant = opts?.instant ?? true;
      const markPlayed = opts?.markPlayed ?? false;
      stopRaf();
      staticFrozen = true;
      phase = "paths";
      console.log("[ParticleStory] enterFinalStatic", {
        instant,
        markPlayed,
        bootGen,
        phase,
      });

      deferHeavyWork(() => {
        if (isStale()) return;
        try {
          const ok = ensureFinalCanvasData();
          if (!ok) {
            htmlOnly = true;
            ctx.clearRect(0, 0, viewW, viewH);
          } else {
            htmlOnly = false;
            paintFinalOnce();
          }
          showHtmlEntries(instant);
          if (markPlayed) markHomeStoryPlayed("enterFinalStatic");
        } catch (err) {
          console.error("[ParticleStory] enterFinalStatic failed", err);
          htmlOnly = true;
          ctx.clearRect(0, 0, viewW, viewH);
          showHtmlEntries(true);
          // 失败路径不写 played，避免永久跳过
        }
      });
    };

    const enterHtmlOnlyFallback = () => {
      stopRaf();
      staticFrozen = true;
      htmlOnly = true;
      ctx.clearRect(0, 0, viewW, viewH);
      pathDustBundles = null;
      rebuildPathDust();
      showHtmlEntries(true);
      // 素材失败不写 played
      console.log("[ParticleStory] enterHtmlOnlyFallback (no mark)");
    };

    const applyCanvasSize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      viewW = window.innerWidth;
      viewH = window.innerHeight;
      canvas.width = Math.max(1, Math.floor(viewW * dpr));
      canvas.height = Math.max(1, Math.floor(viewH * dpr));
      canvas.style.width = `${viewW}px`;
      canvas.style.height = `${viewH}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    const resize = () => {
      applyCanvasSize();

      if (staticFrozen) {
        if (!htmlOnly && roseImg) {
          try {
            buildStaticRoseConverge();
            rebuildPathDust();
            paintFinalOnce();
          } catch (err) {
            console.error("[ParticleStory] static resize failed", err);
          }
        } else if (htmlOnly) {
          rebuildPathDust();
        }
        if (entriesShownRef.current) {
          const mobile = viewW < 768;
          const paths = buildStarPaths(viewW, viewH, mobile);
          setPathEntries((prev) => ({
            ...prev,
            mobile,
            journey: { ...paths[0]!.end },
            letters: { ...paths[1]!.end },
          }));
        }
        return;
      }

      if (phase === "paths") {
        const { mobile, bundles } = rebuildPathDust();
        if (entriesShownRef.current && bundles) {
          setPathEntries((prev) => ({
            ...prev,
            mobile,
            journey: { ...bundles[0]!.end },
            letters: { ...bundles[1]!.end },
          }));
        }
      } else if (entriesShownRef.current) {
        const mobile = viewW < 768;
        const paths = buildStarPaths(viewW, viewH, mobile);
        setPathEntries((prev) => ({
          ...prev,
          mobile,
          journey: { ...paths[0]!.end },
          letters: { ...paths[1]!.end },
        }));
      }
    };

    const enterPhase = (next: StoryPhase, now: number) => {
      phase = next;
      phaseStartedAt = now;
    };

    const beginExplode = (layout: Layout, now: number) => {
      if (!openImg) return;
      const mobile = window.innerWidth < 768;
      const target = mobile
        ? EXPLODE_PARTICLE_MOBILE
        : EXPLODE_PARTICLE_DESKTOP;
      particles = sampleParticlesFromOpen(openImg, layout, target);

      if (particles.length > 0) {
        const heartIndex = Math.floor(Math.random() * particles.length);
        const heart = particles[heartIndex]!;
        heart.isHeart = true;
        heart.r = 255;
        heart.g = 215;
        heart.b = 0;
        heart.a0 = 1;
        heart.x = layout.cx;
        heart.y = layout.cy;
        flowerHeart = { x: layout.cx, y: layout.cy };
        canvas.dataset.flowerHeartX = String(layout.cx);
        canvas.dataset.flowerHeartY = String(layout.cy);
      }

      assignExplosionVelocities(particles, layout);
      explodeSettled = false;
      enterPhase("explode", now);
    };

    const beginConverge = (now: number) => {
      if (!roseImg || !flowerHeart) {
        enterPhase("converge", now);
        return;
      }
      const mobile = window.innerWidth < 768;
      const brightCount = mobile
        ? CONVERGE_PARTICLE_MOBILE
        : CONVERGE_PARTICLE_DESKTOP;
      const darkCount = mobile ? CONVERGE_DARK_MOBILE : CONVERGE_DARK_DESKTOP;
      const roseLayout = layoutForImage(
        roseImg,
        viewW,
        viewH,
        ROSE_HEIGHT_RATIO,
      );
      flowerHeart = { x: roseLayout.cx, y: roseLayout.cy };
      canvas.dataset.flowerHeartX = String(roseLayout.cx);
      canvas.dataset.flowerHeartY = String(roseLayout.cy);

      const bright = sampleRoseTargets(
        roseImg,
        roseLayout,
        brightCount,
        ROSE_STAR_LUMA_MIN,
        255,
        1,
      ).sort((a, b) => a.dist - b.dist);
      const dark = sampleRoseTargets(
        roseImg,
        roseLayout,
        darkCount,
        ROSE_DARK_LUMA_MIN,
        ROSE_STAR_LUMA_MIN,
        CONVERGE_DARK_ALPHA_SCALE,
      ).sort((a, b) => a.dist - b.dist);
      const targets = [...bright, ...dark];
      convergeParticles = buildConvergeParticles(particles, targets);
      enterPhase("converge", now);
    };

    const drawExplodeParticles = (elapsed: number, dtScale: number) => {
      const life = Math.min(1, elapsed / EXPLODE_MS);
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";

      for (const p of particles) {
        if (p.isHeart) continue;

        if (!explodeSettled) {
          p.x += p.vx * dtScale;
          p.y += p.vy * dtScale;
          const drag = Math.pow(EXPLODE_DRAG, dtScale);
          p.vx *= drag;
          p.vy *= drag;
        }

        const alpha = p.a0 * explodeAlphaFactor(life);
        if (alpha <= 0.01) continue;
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${p.r},${p.g},${p.b})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = prev;
      ctx.globalAlpha = 1;
    };

    const drawConvergeOrBloom = (
      elapsed: number,
      blooming: boolean,
      now: number,
    ) => {
      const prev = ctx.globalCompositeOperation;
      ctx.globalCompositeOperation = "lighter";

      let allArrived = convergeParticles.length > 0;

      for (const p of convergeParticles) {
        const raw = (elapsed - p.birth) / CONVERGE_PARTICLE_MS;
        const pProg = blooming ? 1 : smoothstep(raw);
        if (!blooming && pProg < 1) allArrived = false;

        const e = easeOutQuart(pProg);
        const dx = p.tx - p.sx;
        const dy = p.ty - p.sy;
        const journey = Math.hypot(dx, dy) || 1;
        const nx = dx / journey;
        const ny = dy / journey;
        const px = -ny;
        const py = nx;
        const arc = journey * CONVERGE_ARC_AMP * Math.sin(Math.PI * pProg);
        const x = p.sx + dx * e + px * arc;
        const y = p.sy + dy * e + py * arc;

        const r = Math.round(lerp(GOLD_R, p.tr, pProg));
        const g = Math.round(lerp(GOLD_G, p.tg, pProg));
        const b = Math.round(lerp(GOLD_B, p.tb, pProg));

        const baseA = CONVERGE_DRAW_ALPHA * p.aScale;
        let alpha = baseA;
        if (blooming) {
          alpha =
            baseA * (1 + Math.sin(now * 0.0025 + p.breathPhase) * 0.15);
        } else if (pProg <= 0) {
          alpha = 0;
        }

        if (alpha <= 0.02) continue;
        ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
        ctx.fillStyle = `rgb(${r},${g},${b})`;
        ctx.beginPath();
        ctx.arc(x, y, p.size, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalCompositeOperation = prev;
      ctx.globalAlpha = 1;

      return allArrived;
    };

    const drawFrame = (now: number) => {
      const rawDt = lastTs ? now - lastTs : FRAME_MS;
      lastTs = now;
      const dtScale = Math.min(2.5, Math.max(0.2, rawDt / FRAME_MS));

      ctx.clearRect(0, 0, viewW, viewH);

      if (phase === "loading" || !closedImg || !openImg || !roseImg) return;

      const layout = layoutForImage(
        closedImg,
        viewW,
        viewH,
        BOY_HEIGHT_RATIO,
      );
      const elapsed = now - phaseStartedAt;

      if (phase === "sit") {
        ctx.globalAlpha = 1;
        ctx.drawImage(closedImg, layout.x, layout.y, layout.w, layout.h);
        if (elapsed >= SIT_MS) enterPhase("open", now);
        return;
      }

      if (phase === "open") {
        const fadeT = easeInOutQuad(Math.min(1, elapsed / OPEN_FADE_MS));
        let glow = 0;
        if (elapsed < OPEN_FADE_MS) {
          glow = fadeT * 0.8;
        } else {
          const dwellT = easeInOutQuad(
            Math.min(1, (elapsed - OPEN_FADE_MS) / OPEN_DWELL_MS),
          );
          glow = 0.8 + (0.6 - 0.8) * dwellT;
        }

        const glowRadius = Math.max(layout.w, layout.h) * 0.55;
        drawGlow(ctx, layout.cx, layout.cy, glowRadius, glow);
        ctx.globalAlpha = 1;
        ctx.drawImage(closedImg, layout.x, layout.y, layout.w, layout.h);
        ctx.globalAlpha = fadeT;
        ctx.drawImage(openImg, layout.x, layout.y, layout.w, layout.h);
        ctx.globalAlpha = 1;

        if (elapsed >= OPEN_TOTAL_MS) enterPhase("hold", now);
        return;
      }

      if (phase === "hold") {
        const glowRadius = Math.max(layout.w, layout.h) * 0.55;
        drawGlow(ctx, layout.cx, layout.cy, glowRadius, 0.6);
        ctx.globalAlpha = 1;
        ctx.drawImage(openImg, layout.x, layout.y, layout.w, layout.h);
        if (elapsed >= HOLD_MS) beginExplode(layout, now);
        return;
      }

      if (phase === "explode") {
        const imgAlpha =
          elapsed >= EXPLODE_IMG_FADE_MS
            ? 0
            : 1 - elapsed / EXPLODE_IMG_FADE_MS;
        if (imgAlpha > 0.01) {
          ctx.globalAlpha = imgAlpha;
          ctx.drawImage(openImg, layout.x, layout.y, layout.w, layout.h);
          ctx.globalAlpha = 1;
        }

        drawExplodeParticles(Math.min(elapsed, EXPLODE_MS), dtScale);

        if (elapsed >= EXPLODE_MS) {
          explodeSettled = true;
          beginConverge(now);
        }
        return;
      }

      if (phase === "converge") {
        const allArrived = drawConvergeOrBloom(elapsed, false, now);
        const maxBirth =
          (CONVERGE_BUCKET_COUNT - 1) * CONVERGE_BUCKET_GAP_MS +
          CONVERGE_BIRTH_JITTER_MS;
        if (allArrived || elapsed >= maxBirth + CONVERGE_PARTICLE_MS) {
          enterPhase("bloom", now);
        }
        return;
      }

      if (phase === "bloom") {
        drawConvergeOrBloom(1e9, true, now);
        if (elapsed >= BLOOM_TO_PATHS_MS) {
          rebuildPathDust();
          enterPhase("paths", now);
        }
        return;
      }

      if (phase === "paths") {
        drawConvergeOrBloom(1e9, true, now);
        if (!pathDustBundles) rebuildPathDust();
        const bundles = pathDustBundles;
        if (bundles) {
          for (const bundle of bundles) {
            drawPathDustBundle(ctx, bundle, elapsed, now);
          }
        }

        if (
          elapsed >= PATHS_DRAW_MS + PATHS_TO_ENTRIES_MS &&
          !entriesShownRef.current &&
          bundles
        ) {
          entriesShownRef.current = true;
          // 仅在此完整播完后写入标记
          markHomeStoryPlayed("paths-complete");
          const mobile = viewW < 768;
          setPathEntries({
            show: true,
            mobile,
            journey: { ...bundles[0]!.end },
            letters: { ...bundles[1]!.end },
            instant: false,
          });
        }
      }
    };

    const loop = (timestamp: number) => {
      if (disposed || !animating) return;
      frameId = window.requestAnimationFrame(loop);
      try {
        drawFrame(timestamp);
      } catch (err) {
        console.error("[ParticleStory] frame error", err);
        // 异常兜底到最终态，但不写 played（避免首次进站永久跳过）
        enterFinalStatic({ instant: true, markPlayed: false });
      }
    };

    const startPlaying = () => {
      if (isStale()) return;
      animating = true;
      staticFrozen = false;
      htmlOnly = false;
      entriesShownRef.current = false;
      enterPhase("sit", performance.now());
      console.log("[ParticleStory] startPlaying", {
        bootGen,
        phase: "sit",
        flag: readHomeStoryPlayedFlag(),
      });
      frameId = window.requestAnimationFrame(loop);
    };

    applyCanvasSize();
    window.addEventListener("resize", resize);

    const skipInfo = shouldSkipHomeStory();
    console.log("[ParticleStory] mount boot", {
      bootGen,
      initialPhase: phase,
      FORCE_PLAY_HOME_STORY,
      skip: skipInfo.skip,
      skipReason: skipInfo.reason,
      sessionStorageFlag: skipInfo.flag,
      reducedMotion: skipInfo.reducedMotion,
    });
    if (FORCE_PLAY_HOME_STORY) {
      try {
        sessionStorage.removeItem(HOME_STORY_PLAYED_KEY);
        console.log(
          "[ParticleStory] FORCE_PLAY cleared sessionStorage flag; now=",
          readHomeStoryPlayedFlag(),
        );
      } catch {
        /* ignore */
      }
    }

    // 入口图标预加载（不阻塞叙事）
    void loadImage(IMG_ENTRY_JOURNEY).catch(() => undefined);
    void loadImage(IMG_ENTRY_LETTERS).catch(() => undefined);

    void Promise.all([
      loadImage(IMG_CLOSED),
      loadImage(IMG_OPEN),
      loadImage(IMG_ROSE),
    ])
      .then(([closed, open, rose]) => {
        if (isStale()) {
          console.log("[ParticleStory] images ready but stale boot", bootGen);
          return;
        }
        closedImg = closed;
        openImg = open;
        roseImg = rose;

        // 跳过逻辑（FORCE_PLAY 时恒为 false）
        // if (skipInfo.skip) {
        //   enterFinalStatic({ instant: true, markPlayed: false });
        //   return;
        // }
        if (!FORCE_PLAY_HOME_STORY && skipInfo.skip) {
          console.log("[ParticleStory] skipping to final", skipInfo);
          enterFinalStatic({ instant: true, markPlayed: false });
          return;
        }
        // 首屏已可出：先下一帧再开叙事
        window.requestAnimationFrame(() => {
          if (isStale()) return;
          startPlaying();
        });
      })
      .catch((error) => {
        console.error("[ParticleStory] image preload failed", error);
        if (!isStale()) enterHtmlOnlyFallback();
      });

    return () => {
      disposed = true;
      stopRaf();
      window.removeEventListener("resize", resize);
      console.log("[ParticleStory] effect cleanup", { bootGen });
    };
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        className="pointer-events-none fixed inset-0 z-[5]"
        aria-hidden
      />
      {pathEntries.show ? (
        <div className="pointer-events-none fixed inset-0 z-[6]" aria-label="星路入口">
          <Link
            href="/journey"
            className={`path-entry-wrap path-entry-wrap-journey${pathEntries.mobile ? " is-mobile" : ""}`}
            style={{
              left: pathEntries.journey.x,
              top: pathEntries.journey.y,
            }}
            aria-label="星图航线"
          >
            <span
              className={`path-entry path-entry-journey${pathEntries.instant ? " is-instant" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG_ENTRY_JOURNEY} alt="" draggable={false} />
            </span>
          </Link>
          <Link
            href="/letters"
            className={`path-entry-wrap path-entry-wrap-letters${pathEntries.mobile ? " is-mobile" : ""}`}
            style={{
              left: pathEntries.letters.x,
              top: pathEntries.letters.y,
            }}
            aria-label="月光信局"
          >
            <span
              className={`path-entry path-entry-letters${pathEntries.instant ? " is-instant" : ""}`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={IMG_ENTRY_LETTERS} alt="" draggable={false} />
            </span>
          </Link>
        </div>
      ) : null}
      <style>{`
        .path-entry-wrap {
          pointer-events: auto;
          position: absolute;
          display: block;
          transform: translate(-50%, -50%);
          animation: path-entry-float 3.2s ease-in-out 0.75s infinite;
        }
        .path-entry-wrap-journey {
          width: 180px;
          height: 180px;
        }
        .path-entry-wrap-journey.is-mobile {
          width: 125px;
          height: 125px;
        }
        .path-entry-wrap-letters {
          width: 252px;
          height: auto;
        }
        .path-entry-wrap-letters.is-mobile {
          width: 175px;
          height: auto;
        }
        .path-entry {
          display: block;
          border: none;
          outline: none;
          overflow: visible;
          opacity: 0;
          transform: scale(0.35);
          transition: transform 0.25s ease, box-shadow 0.25s ease;
          animation: path-entry-in 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .path-entry.is-instant {
          opacity: 1;
          transform: scale(1);
          animation: none;
        }
        .path-entry-journey {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          box-shadow: 0 0 45px 10px rgba(80, 200, 220, 0.45);
          animation:
            path-entry-in 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards,
            path-entry-glow-cyan 2.8s ease-in-out 0.75s infinite;
        }
        .path-entry-journey.is-instant {
          opacity: 1;
          transform: scale(1);
          animation: path-entry-glow-cyan 2.8s ease-in-out infinite;
        }
        .path-entry-journey img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: cover;
          border: none;
          outline: none;
          border-radius: 50%;
          pointer-events: none;
        }
        .path-entry-letters {
          width: 100%;
          height: auto;
          background: transparent;
          border-radius: 0;
          box-shadow: none;
          filter: none;
          animation: path-entry-in 0.75s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .path-entry-letters.is-instant {
          opacity: 1;
          transform: scale(1);
          animation: none;
        }
        .path-entry-letters img {
          display: block;
          width: 100%;
          height: auto;
          object-fit: contain;
          border: none;
          outline: none;
          border-radius: 0;
          background: transparent;
          pointer-events: none;
        }
        .path-entry-wrap:hover .path-entry,
        .path-entry-wrap:focus-visible .path-entry {
          transform: scale(1.1);
        }
        .path-entry-wrap:hover .path-entry-journey,
        .path-entry-wrap:focus-visible .path-entry-journey {
          box-shadow: 0 0 70px 20px rgba(90, 220, 240, 0.7);
        }
        .path-entry-wrap:focus-visible {
          outline: none;
        }
        @keyframes path-entry-in {
          0% {
            opacity: 0;
            transform: scale(0.35);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
        @keyframes path-entry-float {
          0%,
          100% {
            translate: 0 0;
          }
          50% {
            translate: 0 -4px;
          }
        }
        @keyframes path-entry-glow-cyan {
          0%,
          100% {
            box-shadow: 0 0 35px 8px rgba(80, 200, 220, 0.4);
          }
          50% {
            box-shadow: 0 0 60px 18px rgba(90, 220, 235, 0.65);
          }
        }
      `}</style>
    </>
  );
}
