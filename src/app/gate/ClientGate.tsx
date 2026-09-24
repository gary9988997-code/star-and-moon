"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type KeyboardEvent,
} from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { gateConfig } from "@/data/config";

/** Canvas 流星运行时状态 */
type GateMeteor = {
  id: number;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  born: number;
  duration: number;
  trailLen: number;
  segments: number;
  glowR: number;
};

type GateStar = {
  id: number;
  left: string;
  top: string;
  size: number;
  delay: number;
  duration: number;
};

const PIN_LENGTH = 4;

function buildGateStars(count: number): GateStar[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    left: `${(i * 47 + 13) % 100}%`,
    top: `${(i * 31 + 7) % 100}%`,
    size: 0.7 + (i % 3) * 0.55,
    delay: (i % 9) * 0.35,
    duration: 2.4 + (i % 6) * 0.55,
  }));
}

function RevealQuestion({ text }: { text: string }) {
  return (
    <p className="gate-question font-display text-center text-sm leading-relaxed tracking-wide text-[#F8F5FF]/92 sm:text-base sm:leading-7">
      {text.split("").map((char, index) => (
        <motion.span
          key={`${char}-${index}`}
          className="inline-block"
          initial={{ opacity: 0, y: 10, filter: "blur(4px)" }}
          animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
          transition={{
            duration: 0.45,
            delay: 0.35 + index * 0.045,
            ease: "easeOut",
          }}
        >
          {char === " " ? "\u00A0" : char}
        </motion.span>
      ))}
    </p>
  );
}

export default function ClientGate() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const verifyingRef = useRef(false);
  const [answer, setAnswer] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [shake, setShake] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const meteorCanvasRef = useRef<HTMLCanvasElement>(null);

  const gateStars = useMemo(
    () => buildGateStars(isMobile ? 22 : 42),
    [isMobile],
  );

  const focusHiddenInput = useCallback(() => {
    if (success) return;
    inputRef.current?.focus();
  }, [success]);

  const verifyPin = useCallback(
    (pin: string) => {
      if (verifyingRef.current || success) return;
      verifyingRef.current = true;

      if (pin === gateConfig.password) {
        setError("");
        setSuccess(true);
        window.setTimeout(() => {
          router.push(gateConfig.successRedirect);
        }, 800);
        return;
      }

      setSuccess(false);
      setError(gateConfig.errorMessage);
      setShake(true);
      window.setTimeout(() => {
        setShake(false);
        setAnswer("");
        verifyingRef.current = false;
        inputRef.current?.focus();
      }, 520);
    },
    [router, success],
  );

  function handlePinChange(event: ChangeEvent<HTMLInputElement>) {
    if (success || verifyingRef.current) return;
    const digits = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
    setAnswer(digits);
    if (error) setError("");

    if (digits.length === PIN_LENGTH) {
      window.setTimeout(() => verifyPin(digits), 80);
    }
  }

  function handlePinKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Enter" && answer.length === PIN_LENGTH) {
      event.preventDefault();
      verifyPin(answer);
    }
  }

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 639px)");
    const sync = () => setIsMobile(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    const canvasEl = meteorCanvasRef.current;
    if (!canvasEl) return;
    const surface: HTMLCanvasElement = canvasEl;
    const ctxOrNull = surface.getContext("2d");
    if (!ctxOrNull) return;
    const ctx: CanvasRenderingContext2D = ctxOrNull;

    let cancelled = false;
    let nextId = 0;
    let frameId = 0;
    let timer: number | undefined;
    const live: GateMeteor[] = [];

    // 桌面同屏上限 8（区间 6~8 取上限）；移动端 4（区间 3~4 取上限）
    const maxConcurrent = isMobile ? 4 : 8;

    function nextWaitMs() {
      return isMobile
        ? 800 + Math.random() * 1000 // 0.8~1.8s
        : 400 + Math.random() * 500; // 0.4~0.9s
    }

    function baseDuration() {
      return isMobile
        ? 1.05 + Math.random() * 0.45
        : 1.2 + Math.random() * 0.75;
    }

    /** 与原 CSS cubic-bezier(0.22, 0.61, 0.36, 1) 接近的缓出 */
    function meteorEase(t: number) {
      const x = Math.min(1, Math.max(0, t));
      return 1 - Math.pow(1 - x, 2.6);
    }

    let lastCssW = 0;
    let lastCssH = 0;

    function syncSize() {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const w = surface.clientWidth || window.innerWidth;
      const h = surface.clientHeight || window.innerHeight;
      if (w !== lastCssW || h !== lastCssH) {
        lastCssW = w;
        lastCssH = h;
        surface.width = Math.max(1, Math.floor(w * dpr));
        surface.height = Math.max(1, Math.floor(h * dpr));
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      }
      return { w, h };
    }

    function spawnOne(opts?: { angleDeg?: number; topBias?: number }) {
      if (cancelled || live.length >= maxConcurrent) return;
      const { w, h } = syncSize();
      // 出生：全宽随机，上方 2/3 高度
      const x0 = Math.random() * w;
      const y0 =
        opts?.topBias !== undefined
          ? Math.min(h * (2 / 3) - 8, Math.max(4, opts.topBias))
          : Math.random() * h * (2 / 3);
      // 速度/角度：沿用原 -38° 及流星雨微扰；位移量级对齐原 -78vw / 62vh
      const angleDeg = opts?.angleDeg ?? -38;
      const travelAngle = Math.atan2(62, -78) + ((angleDeg + 38) * Math.PI) / 180;
      const travelDist =
        Math.hypot(0.78 * w, 0.62 * h) * (0.92 + Math.random() * 0.16);
      const x1 = x0 + Math.cos(travelAngle) * travelDist;
      const y1 = y0 + Math.sin(travelAngle) * travelDist;

      live.push({
        id: ++nextId,
        x0,
        y0,
        x1,
        y1,
        born: performance.now(),
        duration: baseDuration() * 1000,
        trailLen: 70 + Math.random() * 90,
        segments: 12 + Math.floor(Math.random() * 7),
        glowR: 6 + Math.random() * 3,
      });
    }

    function spawnLoop() {
      timer = window.setTimeout(() => {
        if (cancelled) return;

        if (Math.random() < 0.15) {
          const showerCount = 3 + Math.floor(Math.random() * 2);
          const { h } = syncSize();
          const baseTop = Math.random() * h * (2 / 3) * 0.85;
          for (let i = 0; i < showerCount; i += 1) {
            spawnOne({
              angleDeg: -38 + (Math.random() - 0.5) * 10,
              topBias: baseTop + i * (12 + Math.random() * 18),
            });
          }
        } else {
          spawnOne();
        }

        spawnLoop();
      }, nextWaitMs());
    }

    function drawMeteor(m: GateMeteor, now: number) {
      const raw = (now - m.born) / m.duration;
      if (raw >= 1) return false;
      const e = meteorEase(raw);
      const x = m.x0 + (m.x1 - m.x0) * e;
      const y = m.y0 + (m.y1 - m.y0) * e;
      const dx = m.x1 - m.x0;
      const dy = m.y1 - m.y0;
      const len = Math.hypot(dx, dy) || 1;
      // 拖尾沿运动反方向
      const bx = -dx / len;
      const by = -dy / len;

      let fade = 1;
      if (raw < 0.08) fade = raw / 0.08;
      else if (raw > 0.75) fade = (1 - raw) / 0.25;
      fade = Math.min(1, Math.max(0, fade));

      const n = m.segments;
      for (let i = n - 1; i >= 0; i -= 1) {
        const t0 = i / n;
        const t1 = (i + 1) / n;
        const tMid = (t0 + t1) * 0.5;
        const px0 = x + bx * m.trailLen * t0;
        const py0 = y + by * m.trailLen * t0;
        const px1 = x + bx * m.trailLen * t1;
        const py1 = y + by * m.trailLen * t1;
        const width = 2.5 * (1 - tMid);
        const alpha = 0.8 * (1 - tMid) * fade;
        if (width < 0.15 || alpha < 0.02) continue;

        const cool = Math.min(1, tMid * 1.6);
        const r = Math.round(255 + (210 - 255) * cool);
        const g = Math.round(255 + (200 - 255) * cool);
        const b = 255;

        ctx.strokeStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.lineWidth = width;
        ctx.lineCap = "round";
        ctx.beginPath();
        ctx.moveTo(px0, py0);
        ctx.lineTo(px1, py1);
        ctx.stroke();
      }

      // 头部光晕 + 2.5px 亮白核心
      const glow = ctx.createRadialGradient(x, y, 0, x, y, m.glowR);
      glow.addColorStop(0, `rgba(255,255,255,${0.85 * fade})`);
      glow.addColorStop(0.45, `rgba(230,220,255,${0.35 * fade})`);
      glow.addColorStop(1, "rgba(255,255,255,0)");
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(x, y, m.glowR, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,255,255,${fade})`;
      ctx.beginPath();
      ctx.arc(x, y, 1.25, 0, Math.PI * 2);
      ctx.fill();

      return true;
    }

    const loop = (now: number) => {
      if (cancelled) return;
      frameId = window.requestAnimationFrame(loop);
      syncSize();
      const w = surface.clientWidth || window.innerWidth;
      const h = surface.clientHeight || window.innerHeight;
      ctx.clearRect(0, 0, w, h);
      ctx.globalCompositeOperation = "lighter";

      for (let i = live.length - 1; i >= 0; i -= 1) {
        const m = live[i]!;
        if (!drawMeteor(m, now)) {
          live.splice(i, 1);
        }
      }

      ctx.globalCompositeOperation = "source-over";
    };

    syncSize();
    spawnLoop();
    frameId = window.requestAnimationFrame(loop);

    const onResize = () => syncSize();
    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      if (timer !== undefined) window.clearTimeout(timer);
      window.cancelAnimationFrame(frameId);
      window.removeEventListener("resize", onResize);
    };
  }, [isMobile]);

  const filled = answer.length;
  const pinError = Boolean(error) && !success;

  return (
    <main className="gate-page relative z-10 flex min-h-dvh items-center justify-center overflow-hidden safe-px safe-py">
      <style>{`
        .gate-page {
          isolation: isolate;
        }
        .gate-sky {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 0;
          overflow: hidden;
        }
        .gate-nebula {
          pointer-events: none;
          position: absolute;
          inset: 0;
          background-image:
            radial-gradient(ellipse 55% 40% at 18% 28%, rgba(139, 92, 246, 0.18), transparent 70%),
            radial-gradient(ellipse 45% 35% at 82% 22%, rgba(167, 139, 250, 0.14), transparent 68%),
            radial-gradient(ellipse 50% 42% at 72% 78%, rgba(88, 28, 135, 0.2), transparent 72%),
            radial-gradient(ellipse 40% 30% at 28% 82%, rgba(251, 191, 36, 0.06), transparent 70%),
            radial-gradient(ellipse 70% 55% at 50% 48%, rgba(26, 16, 61, 0.55), transparent 75%);
        }
        /* grok-shooting-stars 风格：缓慢旋转的星空 */
        .gate-starfield {
          pointer-events: none;
          position: absolute;
          inset: -18%;
          animation: gate-sky-rotate 140s linear infinite;
          will-change: transform;
        }
        .gate-star {
          position: absolute;
          border-radius: 9999px;
          background: #f8f5ff;
          box-shadow: 0 0 4px rgba(216, 180, 254, 0.55);
          animation-name: gate-star-twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes gate-sky-rotate {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes gate-star-twinkle {
          0%, 100% { opacity: 0.35; }
          50% { opacity: 0.95; }
        }
        @media (max-width: 639px) {
          .gate-starfield {
            animation-duration: 200s;
          }
        }
        .gate-moon-orbit {
          position: relative;
          z-index: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          width: clamp(180px, 11vw, 280px);
          margin: 0.85rem 0 0.35rem;
          flex-shrink: 0;
          background: transparent;
        }
        .gate-moon {
          display: block;
          width: 100%;
          height: auto;
          background: transparent;
          border: none;
          box-shadow: none;
          user-select: none;
          pointer-events: none;
          animation: gate-moon-float 5s ease-in-out infinite;
        }
        @keyframes gate-moon-float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        .gate-constellation {
          pointer-events: none;
          position: absolute;
          z-index: 1;
          width: 140px;
          height: 140px;
          animation: gate-constellation-breathe 6.5s ease-in-out infinite;
        }
        .gate-constellation img {
          display: block;
          width: 100%;
          height: 100%;
          object-fit: contain;
          opacity: 0.55;
          mix-blend-mode: screen;
          filter: blur(0.5px) drop-shadow(0 0 12px rgba(167, 139, 250, 0.8));
          pointer-events: none;
          user-select: none;
        }
        .gate-stage {
          position: relative;
          z-index: 2;
          width: 100%;
          max-width: min(100%, 84rem);
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .gate-core {
          position: relative;
          z-index: 2;
          display: flex;
          flex-direction: column;
          align-items: center;
          width: 100%;
          max-width: 22rem;
          text-align: center;
        }
        .gate-question {
          margin-top: 1.75rem;
          max-width: 18rem;
        }
        /* 主体垂直居中后，星座略下移并保持错落 */
        .gate-constellation.is-cancer {
          left: 0;
          top: 58%;
          transform: translateY(calc(-50% + 48px));
        }
        .gate-constellation.is-libra {
          right: 0;
          top: 58%;
          transform: translateY(calc(-50% - 48px));
          animation-delay: -3.2s;
        }
        @media (min-width: 640px) and (max-width: 1023px) {
          .gate-stage {
            padding-left: 300px;
            padding-right: 300px;
          }
          .gate-constellation {
            width: 280px;
            height: 280px;
          }
          .gate-constellation.is-cancer {
            top: 56%;
            transform: translateY(calc(-50% + 44px));
          }
          .gate-constellation.is-libra {
            top: 56%;
            transform: translateY(calc(-50% - 44px));
          }
        }
        @media (min-width: 1024px) {
          .gate-stage {
            padding-left: 380px;
            padding-right: 380px;
          }
          .gate-constellation {
            width: 340px;
            height: 340px;
          }
          .gate-constellation.is-cancer {
            top: 56%;
            transform: translateY(calc(-50% + 56px));
          }
          .gate-constellation.is-libra {
            top: 56%;
            transform: translateY(calc(-50% - 56px));
          }
        }
        @media (min-width: 1280px) {
          .gate-stage {
            padding-left: 420px;
            padding-right: 420px;
          }
          .gate-constellation {
            width: 380px;
            height: 380px;
          }
          .gate-constellation.is-cancer {
            top: 55%;
            transform: translateY(calc(-50% + 64px));
          }
          .gate-constellation.is-libra {
            top: 55%;
            transform: translateY(calc(-50% - 64px));
          }
        }
        @media (max-width: 639px) {
          .gate-stage {
            padding-left: 0;
            padding-right: 0;
            max-width: 100%;
          }
          .gate-core {
            max-width: 17.5rem;
            padding-inline: 4.5rem;
          }
          .gate-constellation {
            width: 118px;
            height: 118px;
          }
          .gate-constellation.is-cancer {
            left: 0;
            right: auto;
            top: 62%;
            transform: translateY(calc(-50% + 36px));
          }
          .gate-constellation.is-libra {
            left: auto;
            right: 0;
            top: 62%;
            bottom: auto;
            transform: translateY(calc(-50% - 36px));
          }
        }
        @keyframes gate-constellation-breathe {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 0.75; }
        }
        .gate-meteor-canvas {
          pointer-events: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          z-index: 1;
        }
        .gate-pin-wrap {
          position: relative;
          margin-top: 1.75rem;
          display: flex;
          justify-content: center;
          width: 100%;
        }
        .gate-pin-dots {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 8px 4px;
          cursor: text;
        }
        .gate-pin-dots.is-shake {
          animation: gate-pin-shake 0.48s ease;
        }
        @keyframes gate-pin-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px); }
          40% { transform: translateX(8px); }
          60% { transform: translateX(-6px); }
          80% { transform: translateX(4px); }
        }
        .gate-pin-dot {
          width: 16px;
          height: 16px;
          border-radius: 9999px;
          border: 1.5px solid rgba(216, 207, 255, 0.85);
          background: transparent;
          box-shadow: 0 0 10px rgba(167, 139, 250, 0.2);
          transition: background-color 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease;
        }
        .gate-pin-dot.is-filled {
          background: rgba(248, 245, 255, 0.95);
          border-color: rgba(248, 245, 255, 0.95);
          box-shadow: 0 0 12px rgba(167, 139, 250, 0.55);
        }
        .gate-pin-dot.is-error {
          border-color: rgba(244, 114, 182, 0.95);
          box-shadow: 0 0 12px rgba(244, 114, 182, 0.45);
        }
        .gate-pin-dot.is-error.is-filled {
          background: rgba(244, 114, 182, 0.9);
          border-color: rgba(244, 114, 182, 0.95);
        }
        .gate-pin-input {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          opacity: 0;
          border: 0;
          padding: 0;
          margin: 0;
          caret-color: transparent;
          color: transparent;
          background: transparent;
          font-size: 16px; /* iOS 避免自动放大 */
          letter-spacing: 0;
          z-index: 2;
        }
      `}</style>

      <div className="gate-sky" aria-hidden>
        <div className="gate-nebula" />
        <div className="gate-starfield">
          {gateStars.map((star) => (
            <span
              key={star.id}
              className="gate-star"
              style={{
                left: star.left,
                top: star.top,
                width: star.size,
                height: star.size,
                animationDuration: `${star.duration}s`,
                animationDelay: `${star.delay}s`,
              }}
            />
          ))}
        </div>
        <canvas ref={meteorCanvasRef} className="gate-meteor-canvas" />
      </div>

      <div className="gate-stage">
        <div className="gate-constellation is-cancer" aria-hidden>
          <img
            src="/images/cancer-outline.png"
            alt=""
            draggable={false}
          />
        </div>
        <div className="gate-constellation is-libra" aria-hidden>
          <img
            src="/images/libra-outline.png"
            alt=""
            draggable={false}
          />
        </div>

        <div className="gate-core">
          <div className="gate-moon-orbit" aria-hidden>
            <img
              className="gate-moon"
              src="/images/cutemoon.png"
              alt=""
              draggable={false}
            />
          </div>
          <RevealQuestion text={gateConfig.question} />

          <div className="gate-pin-wrap">
            <div
              className={`gate-pin-dots${shake || pinError ? " is-shake" : ""}`}
              onClick={focusHiddenInput}
              role="presentation"
            >
              {Array.from({ length: PIN_LENGTH }).map((_, index) => {
                const isFilled = index < filled;
                return (
                  <span
                    key={index}
                    className={`gate-pin-dot${isFilled ? " is-filled" : ""}${pinError ? " is-error" : ""}`}
                    aria-hidden
                  />
                );
              })}
            </div>
            <input
              ref={inputRef}
              id="gate-answer"
              className="gate-pin-input"
              type="tel"
              inputMode="numeric"
              autoComplete="one-time-code"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck={false}
              maxLength={PIN_LENGTH}
              value={answer}
              onChange={handlePinChange}
              onKeyDown={handlePinKeyDown}
              disabled={success}
              aria-label="四位数字密码"
            />
          </div>

          {error ? (
            <p className="mt-3 text-center text-sm text-rose-gold" role="alert">
              {error}
            </p>
          ) : null}

          {success ? (
            <p className="mt-3 text-center text-sm text-moon-gold" role="status">
              {gateConfig.successMessage}
            </p>
          ) : null}
        </div>
      </div>
    </main>
  );
}
