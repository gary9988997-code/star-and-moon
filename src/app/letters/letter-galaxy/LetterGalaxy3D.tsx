"use client";

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import { letters } from "@/data/letters";

export type LetterGalaxyFocusRequest = {
  letterId: string;
  nonce: number;
};

export type LetterGalaxy3DProps = {
  highlightedStarId: string | null;
  dimmed: boolean;
  onOpenLetter: (letterId: string) => void;
  /** 索引导航触发：平滑旋转到信星后回调 */
  focusRequest?: LetterGalaxyFocusRequest | null;
  onFocusComplete?: (letterId: string) => void;
};

/** 主星按半径比例分布在不同旋臂，覆盖中心到外圈 */
const LETTER_RADIUS_RATIOS = [
  0.32, 0.38, 0.46, 0.55, 0.64, 0.72, 0.8, 0.88, 0.94, 0.98,
];
/** 交替旋臂，避免落在同一水平带 */
const LETTER_ARM_ORDER = [0, 1, 2, 1, 0, 2, 0, 2, 1, 0];

const GALAXY_RADIUS_CONST = 4.2;
const SPIN_CONST = 1.12;

function buildLetterStarPositions(galaxyRadius: number, spin: number) {
  return LETTER_RADIUS_RATIOS.map((ratio, i) => {
    const branchIndex = LETTER_ARM_ORDER[i];
    const radius = ratio * galaxyRadius * 0.96;
    const branchAngle =
      (branchIndex * Math.PI * 2) / 3 + (i % 2 === 0 ? -0.12 : 0.14);
    const spinAngle = radius * spin;
    const angle = branchAngle + spinAngle;
    const embed = ((i % 3) - 1) * 0.06;
    const yLift = ((i % 4) - 1.5) * 0.035;
    return {
      letterId: String(i + 1),
      x: Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * embed,
      y: yLift,
      z: Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * embed,
    };
  });
}

/** 将信星转到面向相机（+Z）所需的 rotation.y */
function targetRotationYForLetter(letterId: string) {
  const star = buildLetterStarPositions(GALAXY_RADIUS_CONST, SPIN_CONST).find(
    (item) => item.letterId === letterId,
  );
  if (!star) return null;
  return -Math.atan2(star.x, star.z);
}

function shortestAngleDelta(from: number, to: number) {
  let delta = to - from;
  while (delta > Math.PI) delta -= Math.PI * 2;
  while (delta < -Math.PI) delta += Math.PI * 2;
  return delta;
}

function isMobileViewport() {
  if (typeof window === "undefined") return false;
  return window.matchMedia("(max-width: 768px)").matches;
}

function gaussianRandom() {
  let u = 0;
  let v = 0;
  while (u === 0) u = Math.random();
  while (v === 0) v = Math.random();
  return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
}

/** 半径相关的盘面半厚度（高斯采样），中心厚、外围薄 */
function thicknessHalf(rNorm: number) {
  let full: number;
  if (rNorm < 0.28) {
    full = 0.45 + Math.random() * 0.25;
  } else if (rNorm < 0.68) {
    full = 0.22 + Math.random() * 0.18;
  } else {
    full = 0.08 + Math.random() * 0.1;
  }
  return (full * 0.5) * (0.85 + Math.abs(gaussianRandom()) * 0.15);
}

function colorAlongRadius(rNorm: number, roll: number) {
  const c = new THREE.Color();
  if (rNorm < 0.18) {
    c.set(roll < 0.55 ? "#fff9df" : "#e8d7a8");
  } else if (rNorm < 0.45) {
    c.set(roll < 0.5 ? "#f5ecd0" : "#d4c8a8");
  } else if (rNorm < 0.72) {
    c.set(roll < 0.45 ? "#c8c4e0" : "#9ea3d4");
  } else {
    c.set(roll < 0.6 ? "#7f86d9" : "#6b73c4");
  }
  return c;
}

function LetterGalaxyFallback({
  dimmed,
  onOpenLetter,
  highlightedStarId,
}: LetterGalaxy3DProps) {
  const stars = buildLetterStarPositions(4.2, 1.12);
  return (
    <div
      className="letter-galaxy-fallback"
      style={{ opacity: dimmed ? 0.3 : 1 }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/letter-galaxy-fallback.svg"
        alt=""
        className="letter-galaxy-fallback-img"
        draggable={false}
      />
      {stars.map((star, index) => {
        const letter = letters.find((item) => item.id === star.letterId);
        if (!letter) return null;
        const left = 22 + (index % 5) * 12;
        const top = 46 + Math.floor(index / 5) * 14;
        const active = highlightedStarId === letter.id;
        return (
          <button
            key={star.letterId}
            type="button"
            className={`letter-galaxy-hit${active ? " is-active" : ""}`}
            style={{ left: `${left}%`, top: `${top}%` }}
            aria-label={`打开信件：${letter.date}`}
            title={letter.date}
            onClick={(event) => {
              const button = event.currentTarget;
              button.classList.remove("is-pulse");
              void button.offsetWidth;
              button.classList.add("is-pulse");
              window.setTimeout(() => button.classList.remove("is-pulse"), 900);
              onOpenLetter(letter.id);
            }}
          >
            <span className="letter-galaxy-hit-core" />
            <span className="letter-galaxy-hit-tip">{letter.date}</span>
          </button>
        );
      })}
    </div>
  );
}

export default function LetterGalaxy3D({
  highlightedStarId,
  dimmed,
  onOpenLetter,
  focusRequest = null,
  onFocusComplete,
}: LetterGalaxy3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<HTMLDivElement>(null);
  const hitsRef = useRef<HTMLDivElement>(null);
  const hitButtonsRef = useRef<Map<string, HTMLButtonElement>>(new Map());
  const dimmedRef = useRef(dimmed);
  const onOpenLetterRef = useRef(onOpenLetter);
  const onFocusCompleteRef = useRef(onFocusComplete);
  const focusRequestRef = useRef(focusRequest);
  const lastFocusNonceRef = useRef<number | null>(null);
  const [failed, setFailed] = useState(false);

  dimmedRef.current = dimmed;
  onOpenLetterRef.current = onOpenLetter;
  onFocusCompleteRef.current = onFocusComplete;
  focusRequestRef.current = focusRequest;

  /** WebGL 回退时仍响应索引导航 */
  useEffect(() => {
    if (!failed || !focusRequest) return;
    if (focusRequest.nonce === lastFocusNonceRef.current) return;
    lastFocusNonceRef.current = focusRequest.nonce;
    const letterId = focusRequest.letterId;
    const timer = window.setTimeout(() => {
      onFocusCompleteRef.current?.(letterId);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [failed, focusRequest]);

  useEffect(() => {
    const mount = mountRef.current;
    const dragPlane = dragRef.current;
    const hitsRoot = hitsRef.current;
    if (!mount || !dragPlane || !hitsRoot) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        alpha: true,
        powerPreference: "high-performance",
      });
    } catch {
      setFailed(true);
      return;
    }

    if (!renderer.getContext()) {
      renderer.dispose();
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, 1, 0.1, 100);
    // 提高相机：轻微俯视，椭圆比例约 0.55–0.65
    // 相机略降，便于看见厚度，但仍保持轻微俯视
    camera.position.set(0, 7.05, 8.35);
    camera.lookAt(0, -0.02, 0);

    const mobile = isMobileViewport();
    const GALAXY_RADIUS = GALAXY_RADIUS_CONST;
    const SPIN = SPIN_CONST;
    const ARM_COUNT = 3;
    const particleCount = mobile ? 20000 : 52000;
    const diskCount = Math.floor(particleCount * 0.45);
    const armCount = Math.floor(particleCount * 0.28);
    const coreCount = Math.floor(particleCount * 0.12);
    const outerCount = Math.floor(particleCount * 0.05);
    const haloCount =
      particleCount - diskCount - armCount - coreCount - outerCount;

    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    let write = 0;
    const putParticle = (
      x: number,
      y: number,
      z: number,
      color: THREE.Color,
      brightness: number,
    ) => {
      // 按相对相机方向的粗略深度微调明暗（生成时烘焙，保留 sizeAttenuation）
      const depthBias = (y * 0.35 + z * 0.55) / GALAXY_RADIUS;
      const depthMul =
        0.82 + Math.max(0, Math.min(1, depthBias * 0.5 + 0.5)) * 0.28;
      const b = brightness * depthMul;
      const i = write++;
      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;
      colors[i * 3] = Math.min(1, color.r * b);
      colors[i * 3 + 1] = Math.min(1, color.g * b);
      colors[i * 3 + 2] = Math.min(1, color.b * b);
    };

    // 45% 基础盘面
    for (let i = 0; i < diskCount; i++) {
      const radius = Math.pow(Math.random(), 1.55) * GALAXY_RADIUS;
      const rNorm = radius / GALAXY_RADIUS;
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = gaussianRandom() * thicknessHalf(rNorm);
      const color = colorAlongRadius(rNorm, Math.random());
      const brightness =
        (0.55 + (1 - rNorm) * 0.4) * (0.75 + Math.random() * 0.35);
      putParticle(x, y, z, color, brightness);
    }

    // 28% 旋臂增强（云团状）
    for (let i = 0; i < armCount; i++) {
      const radius = Math.pow(Math.random(), 1.4) * GALAXY_RADIUS;
      const rNorm = radius / GALAXY_RADIUS;
      const branchIndex = i % ARM_COUNT;
      const branchAngle = (branchIndex * Math.PI * 2) / ARM_COUNT;
      const spinAngle = radius * SPIN;
      const angle = branchAngle + spinAngle;
      const armWidth = 0.18 + rNorm * 0.72;
      const perp = gaussianRandom() * armWidth * 0.55;
      const radialJitter = gaussianRandom() * (0.05 + rNorm * 0.18);
      const rr = Math.max(0.02, radius + radialJitter);
      const x =
        Math.cos(angle) * rr + Math.cos(angle + Math.PI / 2) * perp;
      const z =
        Math.sin(angle) * rr + Math.sin(angle + Math.PI / 2) * perp;
      const y = gaussianRandom() * thicknessHalf(rNorm) * 1.05;
      const color = colorAlongRadius(rNorm, Math.random());
      const brightness =
        (0.65 + (1 - rNorm) * 0.35) *
        (1.15 + Math.random() * 0.15) *
        (0.75 + Math.random() * 0.3);
      putParticle(x, y, z, color, brightness);
    }

    // 12% 中心核（轻微球状隆起，比外围更厚）
    const coreRadius = GALAXY_RADIUS * 0.15;
    for (let i = 0; i < coreCount; i++) {
      const u = Math.random();
      const v = Math.random();
      const theta = u * Math.PI * 2;
      const phi = Math.acos(2 * v - 1);
      const rr = Math.pow(Math.random(), 0.48) * coreRadius;
      const x = rr * Math.sin(phi) * Math.cos(theta) * 1.15;
      const y = rr * Math.sin(phi) * Math.sin(theta) * 0.72;
      const z = rr * Math.cos(phi) * 0.95;
      const dist = Math.sqrt(x * x + z * z) / coreRadius;
      const color = new THREE.Color(
        dist < 0.45
          ? Math.random() < 0.6
            ? "#fff9df"
            : "#e8d7a8"
          : Math.random() < 0.5
            ? "#e8d7a8"
            : "#b8b6d4",
      );
      const brightness =
        0.75 + (1 - dist) * 0.35 * (0.8 + Math.random() * 0.25);
      putParticle(x, y, z, color, brightness);
    }

    // 5% 外围盘
    for (let i = 0; i < outerCount; i++) {
      const radius =
        GALAXY_RADIUS * (0.78 + Math.pow(Math.random(), 0.85) * 0.45);
      const rNorm = Math.min(1.25, radius / GALAXY_RADIUS);
      const angle = Math.random() * Math.PI * 2;
      const x = Math.cos(angle) * radius;
      const z = Math.sin(angle) * radius;
      const y = gaussianRandom() * thicknessHalf(Math.min(1, rNorm));
      const color = colorAlongRadius(Math.min(1, rNorm), Math.random());
      putParticle(x, y, z, color, 0.35 + Math.random() * 0.25);
    }

    // ~10% 外围/上下 halo：左右延展、更暗更疏，柔化星系边缘
    for (let i = 0; i < haloCount; i++) {
      const edgeBias = Math.pow(Math.random(), 0.55);
      const radius =
        GALAXY_RADIUS * (0.72 + edgeBias * 0.7 + Math.random() * 0.18);
      const rNorm = Math.min(1.45, radius / GALAXY_RADIUS);
      const angle = Math.random() * Math.PI * 2;
      // 左右延展，避免规则圆环
      const stretchX = 1.12 + Math.pow(Math.random(), 0.8) * 0.42;
      const stretchZ = 0.92 + Math.random() * 0.18;
      const x = Math.cos(angle) * radius * stretchX;
      const z = Math.sin(angle) * radius * stretchZ;
      const side = Math.random() < 0.55 ? (Math.random() < 0.5 ? -1 : 1) : 0;
      const y =
        side === 0
          ? gaussianRandom() * thicknessHalf(Math.min(1, rNorm)) * 0.7
          : side *
            (0.08 + Math.random() * 0.22 + thicknessHalf(Math.min(1, rNorm)) * 0.45);
      const color = new THREE.Color(
        Math.random() < 0.5 ? "#7f86d9" : Math.random() < 0.5 ? "#9b8fd9" : "#6b73c4",
      );
      putParticle(x, y, z, color, 0.07 + Math.random() * 0.1);
    }

    // 校验：数量、NaN
    let nanCount = 0;
    for (let i = 0; i < positions.length; i++) {
      if (!Number.isFinite(positions[i])) {
        positions[i] = 0;
        nanCount += 1;
      }
    }
    for (let i = 0; i < colors.length; i++) {
      if (!Number.isFinite(colors[i])) {
        colors[i] = 0.8;
        nanCount += 1;
      }
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));

    // 先用明确可见的 PointsMaterial 恢复粒子层（避免 ShaderMaterial 静默失败）
    const material = new THREE.PointsMaterial({
      size: 0.035,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    material.visible = true;

    const galaxyRoot = new THREE.Group();
    galaxyRoot.position.y = 0.05;
    galaxyRoot.scale.setScalar(0.9);
    scene.add(galaxyRoot);

    const galaxyPoints = new THREE.Points(geometry, material);
    galaxyPoints.visible = true;
    galaxyPoints.frustumCulled = false;
    galaxyRoot.add(galaxyPoints);

    const positionCount = geometry.attributes.position.count;
    const inScene = galaxyRoot.children.includes(galaxyPoints);
    // 诊断日志：便于确认粒子层挂载与数据有效性
    console.info("[LetterGalaxy] particle diagnostics", {
      write,
      particleCount,
      positionCount,
      nanFixed: nanCount,
      materialVisible: material.visible,
      materialOpacity: material.opacity,
      pointsVisible: galaxyPoints.visible,
      addedToRoot: inScene,
      rootInScene: scene.children.includes(galaxyRoot),
      cameraNear: camera.near,
      cameraFar: camera.far,
      cameraPos: camera.position.toArray(),
    });

    const disposables: { dispose: () => void }[] = [geometry, material];

    const letterGroup = new THREE.Group();
    galaxyRoot.add(letterGroup);

    const letterCoreGeo = new THREE.SphereGeometry(0.024, 10, 10);
    const letterGlowGeo = new THREE.SphereGeometry(0.05, 10, 10);
    disposables.push(letterCoreGeo, letterGlowGeo);

    const LETTER_STAR_POSITIONS = buildLetterStarPositions(
      GALAXY_RADIUS,
      SPIN,
    );

    const letterMeshes: {
      letterId: string;
      mesh: THREE.Object3D;
      button: HTMLButtonElement;
    }[] = [];

    const worldPos = new THREE.Vector3();
    const projected = new THREE.Vector3();
    const buttonMap = new Map<string, HTMLButtonElement>();

    for (let index = 0; index < LETTER_STAR_POSITIONS.length; index++) {
      const star = LETTER_STAR_POSITIONS[index];
      const letter = letters.find((item) => item.id === star.letterId);
      const root = new THREE.Group();
      root.position.set(star.x, star.y, star.z);

      const coreMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#fff9df"),
        transparent: true,
        opacity: 0.95,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      const glowMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color("#e8d7a8"),
        transparent: true,
        opacity: 0.28,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      disposables.push(coreMat, glowMat);
      root.add(new THREE.Mesh(letterGlowGeo, glowMat));
      root.add(new THREE.Mesh(letterCoreGeo, coreMat));
      letterGroup.add(root);

      const hasRays = index === 1 || index === 4 || index === 7;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `letter-galaxy-hit${hasRays ? " has-rays" : ""}`;
      button.dataset.letterId = star.letterId;
      button.setAttribute(
        "aria-label",
        `打开信件：${letter?.date ?? star.letterId}`,
      );
      button.title = letter?.date ?? star.letterId;
      button.innerHTML =
        (hasRays
          ? '<span class="letter-galaxy-hit-rays" aria-hidden="true"></span>'
          : "") +
        '<span class="letter-galaxy-hit-core"></span>' +
        `<span class="letter-galaxy-hit-tip">${letter?.date ?? ""}</span>`;
      button.addEventListener("click", (event) => {
        event.stopPropagation();
        const hit = hitButtonsRef.current.get(star.letterId);
        if (hit) {
          hit.classList.remove("is-pulse");
          void hit.offsetWidth;
          hit.classList.add("is-pulse");
          window.setTimeout(() => hit.classList.remove("is-pulse"), 900);
        }
        onOpenLetterRef.current(star.letterId);
      });
      hitsRoot.appendChild(button);
      buttonMap.set(star.letterId, button);
      letterMeshes.push({ letterId: star.letterId, mesh: root, button });
    }
    hitButtonsRef.current = buttonMap;

    renderer.setClearColor(0x000000, 0);
    renderer.domElement.style.pointerEvents = "none";
    renderer.domElement.style.display = "block";
    renderer.domElement.style.width = "100%";
    renderer.domElement.style.height = "100%";
    mount.appendChild(renderer.domElement);

    const setSize = () => {
      const width = mount.clientWidth || window.innerWidth;
      const height = mount.clientHeight || window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 1.5);
      renderer.setPixelRatio(dpr);
      renderer.setSize(width, height, false);
      camera.aspect = width / height;
      camera.updateProjectionMatrix();
    };
    setSize();

    const AUTO_ROTATE_STEP = 0.0012;
    const RESUME_DELAY_SEC = 0.65;
    const RESUME_RAMP_SEC = 0.85;
    const NEAR_ANGLE = 0.22;

    const focusDurationForDelta = (absDelta: number) => {
      if (absDelta < NEAR_ANGLE) return 0.2;
      const t = Math.min(1, (absDelta - NEAR_ANGLE) / (Math.PI - NEAR_ANGLE));
      return 0.45 + t * 0.2;
    };

    const rotation = { x: -0.26, y: 0.22 };
    const drag = {
      active: false,
      pointerId: -1,
      lastX: 0,
      lastY: 0,
    };
    let frameId = 0;
    let disposed = false;
    let lastTime = performance.now();
    let focusAnim: {
      letterId: string;
      fromY: number;
      delta: number;
      elapsed: number;
      duration: number;
      token: number;
    } | null = null;
    let focusToken = 0;
    /** 定位开始后、弹窗尚未 dim 前，禁止自动旋转 */
    let holdAutoRotate = false;
    let wasDimmed = dimmedRef.current;
    let resumeDelay = 0;
    let rotateFactor = dimmedRef.current ? 0 : 1;

    const pulseStar = (letterId: string) => {
      const button = hitButtonsRef.current.get(letterId);
      if (!button) return;
      button.classList.remove("is-pulse");
      void button.offsetWidth;
      button.classList.add("is-pulse");
      window.setTimeout(() => {
        button.classList.remove("is-pulse");
      }, 900);
    };

    const syncHits = () => {
      const width = mount.clientWidth || 1;
      const height = mount.clientHeight || 1;
      const blocked = dimmedRef.current;
      for (const item of letterMeshes) {
        item.mesh.getWorldPosition(worldPos);
        projected.copy(worldPos).project(camera);
        const x = (projected.x * 0.5 + 0.5) * width;
        const y = (-projected.y * 0.5 + 0.5) * height;
        const visible =
          projected.z < 1 &&
          x > -48 &&
          x < width + 48 &&
          y > height * 0.1 &&
          y < height + 48;
        item.button.style.left = `${x}px`;
        item.button.style.top = `${y}px`;
        item.button.style.display = visible ? "flex" : "none";
        item.button.style.pointerEvents = blocked ? "none" : "auto";
      }
    };

    const animate = (now: number) => {
      if (disposed) return;
      frameId = window.requestAnimationFrame(animate);
      const dt = Math.min(0.05, (now - lastTime) / 1000);
      lastTime = now;

      const dimmedNow = dimmedRef.current;

      // 弹窗打开：取消定位动画，保持暂停；关闭后延迟再缓起旋转
      if (dimmedNow) {
        if (focusAnim) {
          focusToken += 1;
          focusAnim = null;
        }
        holdAutoRotate = false;
        rotateFactor = 0;
        resumeDelay = 0;
        drag.active = false;
      } else if (wasDimmed && !dimmedNow) {
        resumeDelay = RESUME_DELAY_SEC;
        rotateFactor = 0;
      }
      wasDimmed = dimmedNow;

      const req = focusRequestRef.current;
      if (req && req.nonce !== lastFocusNonceRef.current) {
        lastFocusNonceRef.current = req.nonce;
        const targetY = targetRotationYForLetter(req.letterId);
        if (targetY != null) {
          drag.active = false;
          holdAutoRotate = true;
          rotateFactor = 0;
          resumeDelay = 0;
          focusToken += 1;
          const token = focusToken;
          const delta = shortestAngleDelta(rotation.y, targetY);
          focusAnim = {
            letterId: req.letterId,
            fromY: rotation.y,
            delta,
            elapsed: 0,
            duration: focusDurationForDelta(Math.abs(delta)),
            token,
          };
        }
      }

      if (focusAnim) {
        focusAnim.elapsed += dt;
        const t = Math.min(1, focusAnim.elapsed / focusAnim.duration);
        const eased = 1 - Math.pow(1 - t, 3);
        rotation.y = focusAnim.fromY + focusAnim.delta * eased;
        if (t >= 1) {
          const letterId = focusAnim.letterId;
          const token = focusAnim.token;
          focusAnim = null;
          pulseStar(letterId);
          // 定位完成即回调开信，不再额外固定长延迟
          if (token === focusToken && !disposed) {
            onFocusCompleteRef.current?.(letterId);
            // 若弹窗未及时打开（任务已被取消），避免永久锁死自动旋转
            window.setTimeout(() => {
              if (disposed || token !== focusToken) return;
              if (!dimmedRef.current && holdAutoRotate && !focusAnim) {
                holdAutoRotate = false;
                resumeDelay = RESUME_DELAY_SEC;
                rotateFactor = 0;
              }
            }, 400);
          }
        }
      } else if (!drag.active && !dimmedNow && !holdAutoRotate) {
        if (resumeDelay > 0) {
          resumeDelay -= dt;
          rotateFactor = 0;
        } else if (rotateFactor < 1) {
          rotateFactor = Math.min(1, rotateFactor + dt / RESUME_RAMP_SEC);
        }
        if (rotateFactor > 0) {
          rotation.y += AUTO_ROTATE_STEP * rotateFactor;
        }
      }

      // 弹窗已打开则由 dimmed 接管暂停
      if (dimmedNow) {
        holdAutoRotate = false;
        rotateFactor = 0;
      }

      galaxyRoot.rotation.y = rotation.y;
      galaxyRoot.rotation.x = rotation.x;
      renderer.render(scene, camera);
      syncHits();
    };
    frameId = window.requestAnimationFrame(animate);

    const onPointerDown = (event: PointerEvent) => {
      if (dimmedRef.current) return;
      if (focusAnim || holdAutoRotate) return;
      if (event.pointerType === "mouse" && event.button !== 0) return;
      drag.active = true;
      drag.pointerId = event.pointerId;
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
      dragPlane.setPointerCapture(event.pointerId);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (!drag.active || drag.pointerId !== event.pointerId) return;
      const dx = event.clientX - drag.lastX;
      const dy = event.clientY - drag.lastY;
      rotation.y += dx * 0.005;
      rotation.x = Math.max(
        -0.48,
        Math.min(-0.08, rotation.x + dy * 0.003),
      );
      drag.lastX = event.clientX;
      drag.lastY = event.clientY;
    };

    const onPointerUp = (event: PointerEvent) => {
      if (drag.pointerId !== event.pointerId) return;
      drag.active = false;
      drag.pointerId = -1;
      try {
        dragPlane.releasePointerCapture(event.pointerId);
      } catch {
        /* ignore */
      }
    };

    const onResize = () => setSize();

    dragPlane.addEventListener("pointerdown", onPointerDown);
    dragPlane.addEventListener("pointermove", onPointerMove);
    dragPlane.addEventListener("pointerup", onPointerUp);
    dragPlane.addEventListener("pointercancel", onPointerUp);
    window.addEventListener("resize", onResize);

    return () => {
      disposed = true;
      window.cancelAnimationFrame(frameId);
      dragPlane.removeEventListener("pointerdown", onPointerDown);
      dragPlane.removeEventListener("pointermove", onPointerMove);
      dragPlane.removeEventListener("pointerup", onPointerUp);
      dragPlane.removeEventListener("pointercancel", onPointerUp);
      window.removeEventListener("resize", onResize);
      hitButtonsRef.current = new Map();

      for (const item of letterMeshes) {
        item.button.remove();
      }
      disposables.forEach((item) => item.dispose());
      renderer.dispose();
      if (renderer.domElement.parentElement === mount) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, []);

  useEffect(() => {
    hitButtonsRef.current.forEach((button, letterId) => {
      button.classList.toggle("is-active", highlightedStarId === letterId);
    });
  }, [highlightedStarId]);

  if (failed) {
    return (
      <LetterGalaxyFallback
        dimmed={dimmed}
        onOpenLetter={onOpenLetter}
        highlightedStarId={highlightedStarId}
      />
    );
  }

  return (
    <div className="letter-galaxy-3d" style={{ opacity: dimmed ? 0.3 : 1 }}>
      <style>{`
        .letter-galaxy-hit-core {
          width: 7px !important;
          height: 7px !important;
          background: #fff9df !important;
          box-shadow:
            0 0 2px 1px rgba(255, 249, 223, 0.95),
            0 0 8px 2px rgba(232, 215, 168, 0.5) !important;
        }
        .letter-galaxy-hit.has-rays .letter-galaxy-hit-rays {
          pointer-events: none;
          position: absolute;
          inset: -6px;
          opacity: 0.5;
        }
        .letter-galaxy-hit.has-rays .letter-galaxy-hit-rays::before,
        .letter-galaxy-hit.has-rays .letter-galaxy-hit-rays::after {
          content: "";
          position: absolute;
          left: 50%;
          top: 50%;
          transform: translate(-50%, -50%);
        }
        .letter-galaxy-hit.has-rays .letter-galaxy-hit-rays::before {
          width: 1px;
          height: 14px;
          background: linear-gradient(
            to bottom,
            transparent,
            rgba(255, 248, 221, 0.7) 45%,
            rgba(255, 248, 221, 0.7) 55%,
            transparent
          );
        }
        .letter-galaxy-hit.has-rays .letter-galaxy-hit-rays::after {
          width: 14px;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 248, 221, 0.7) 45%,
            rgba(255, 248, 221, 0.7) 55%,
            transparent
          );
        }
        .letter-galaxy-hit.is-pulse .letter-galaxy-hit-core {
          animation: letter-galaxy-hit-pulse 0.9s ease-out;
        }
        @keyframes letter-galaxy-hit-pulse {
          0% {
            transform: scale(1);
            box-shadow:
              0 0 2px 1px rgba(255, 249, 223, 0.95),
              0 0 8px 2px rgba(232, 215, 168, 0.5);
          }
          35% {
            transform: scale(1.9);
            box-shadow:
              0 0 4px 2px rgba(255, 236, 180, 1),
              0 0 18px 6px rgba(246, 210, 130, 0.7),
              0 0 28px 10px rgba(232, 190, 110, 0.35);
          }
          100% {
            transform: scale(1);
            box-shadow:
              0 0 2px 1px rgba(255, 249, 223, 0.95),
              0 0 8px 2px rgba(232, 215, 168, 0.5);
          }
        }
      `}</style>
      <div ref={mountRef} className="letter-galaxy-3d-canvas" aria-hidden />
      <div
        ref={dragRef}
        className="letter-galaxy-3d-drag"
        style={{ pointerEvents: dimmed ? "none" : "auto" }}
        aria-hidden
      />
      <div ref={hitsRef} className="letter-galaxy-3d-hits" />
    </div>
  );
}
