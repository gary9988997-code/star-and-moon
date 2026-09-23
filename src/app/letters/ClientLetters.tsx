"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type TouchEvent as ReactTouchEvent,
} from "react";
import {
  letters,
  lettersCopy,
  type Letter,
} from "@/data/letters";
import { LetterPaperBody } from "./LetterPaperBody";
import LetterGalaxy from "./letter-galaxy/LetterGalaxy";

function ambientSeed(n: number) {
  const x = Math.sin(n * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

/** 全域远处背景星（固定种子，避免抖动） */
const LETTERS_AMBIENT_STARS = Array.from({ length: 180 }, (_, i) => {
  const nearGalaxy = ambientSeed(i * 3 + 1) < 0.42;
  const left = nearGalaxy
    ? 26 + ambientSeed(i * 5 + 2) * 48
    : ambientSeed(i * 7 + 3) * 100;
  const top = nearGalaxy
    ? 30 + ambientSeed(i * 11 + 4) * 46
    : ambientSeed(i * 13 + 5) * 100;
  const size = 0.5 + ambientSeed(i * 17 + 6) * 1.5;
  const opacity = 0.15 + ambientSeed(i * 19 + 7) * 0.35;
  return { id: i, left, top, size, opacity };
});

function ManuscriptGallery({
  images,
  onClose,
}: {
  images: string[];
  onClose: () => void;
}) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [scale, setScale] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const pinchRef = useRef<{ distance: number; scale: number } | null>(null);
  const swipeRef = useRef<{
    pointerId: number;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);

  const total = images.length;
  const safeIndex =
    total > 0 ? ((currentImageIndex % total) + total) % total : 0;
  const canSwipe = total > 1 && scale <= 1.02;

  const resetZoom = useCallback(() => {
    setScale(1);
    setOffset({ x: 0, y: 0 });
  }, []);

  const goTo = useCallback(
    (next: number) => {
      if (total <= 0) return;
      const clamped = ((next % total) + total) % total;
      setCurrentImageIndex(clamped);
      resetZoom();
    },
    [resetZoom, total],
  );

  useEffect(() => {
    setCurrentImageIndex(0);
    resetZoom();
  }, [images, resetZoom]);

  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
        return;
      }
      if (event.key === "ArrowLeft") goTo(safeIndex - 1);
      if (event.key === "ArrowRight") goTo(safeIndex + 1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [goTo, onClose, safeIndex]);

  function touchDistance(touches: ReactTouchEvent["touches"]) {
    if (touches.length < 2) return 0;
    const a = touches[0];
    const b = touches[1];
    return Math.hypot(a.clientX - b.clientX, a.clientY - b.clientY);
  }

  function handleTouchStart(event: ReactTouchEvent) {
    if (event.touches.length === 2) {
      pinchRef.current = {
        distance: touchDistance(event.touches),
        scale,
      };
      swipeRef.current = null;
    }
  }

  function handleTouchMove(event: ReactTouchEvent) {
    if (event.touches.length === 2 && pinchRef.current) {
      event.preventDefault();
      const distance = touchDistance(event.touches);
      if (pinchRef.current.distance <= 0) return;
      const next =
        (pinchRef.current.scale * distance) / pinchRef.current.distance;
      setScale(Math.min(4, Math.max(1, next)));
    }
  }

  function handleTouchEnd(event: ReactTouchEvent) {
    if (event.touches.length < 2) {
      pinchRef.current = null;
      if (scale < 1.05) {
        setScale(1);
        setOffset({ x: 0, y: 0 });
      }
    }
  }

  function handlePointerDown(event: ReactPointerEvent) {
    if (event.pointerType === "touch" && !event.isPrimary) return;
    swipeRef.current = {
      pointerId: event.pointerId,
      startX: event.clientX,
      startY: event.clientY,
      originX: offset.x,
      originY: offset.y,
    };
    (event.currentTarget as HTMLElement).setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent) {
    const drag = swipeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    if (scale > 1.05) {
      setOffset({ x: drag.originX + dx, y: drag.originY + dy });
    }
  }

  function handlePointerUp(event: ReactPointerEvent) {
    const drag = swipeRef.current;
    if (!drag || drag.pointerId !== event.pointerId) return;
    const dx = event.clientX - drag.startX;
    const dy = event.clientY - drag.startY;
    swipeRef.current = null;
    if (canSwipe && Math.abs(dx) > 56 && Math.abs(dx) > Math.abs(dy)) {
      suppressClickRef.current = true;
      goTo(dx < 0 ? safeIndex + 1 : safeIndex - 1);
    }
  }

  if (total === 0) return null;

  function handleImageClick(event: React.MouseEvent<HTMLImageElement>) {
    event.stopPropagation();
    if (suppressClickRef.current) {
      suppressClickRef.current = false;
      return;
    }
    if (total <= 1) return;
    goTo(safeIndex + 1);
  }

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/80"
      style={{ width: "100vw", height: "100vh" }}
      role="dialog"
      aria-modal="true"
      aria-label="手写原稿"
      onClick={onClose}
    >
      <div
        className="absolute inset-0 flex items-center justify-center"
        style={{ width: "100vw", height: "100vh" }}
        onClick={onClose}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={images[safeIndex]}
          src={images[safeIndex]}
          alt={`手写原稿第 ${safeIndex + 1} 页，共 ${total} 页`}
          draggable={false}
          onClick={handleImageClick}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          className="block cursor-pointer select-none touch-none"
          style={{
            maxWidth: "90%",
            maxHeight: "90%",
            width: "auto",
            height: "auto",
            objectFit: "contain",
            transform: `translate(${offset.x}px, ${offset.y}px) scale(${scale})`,
            transformOrigin: "center center",
          }}
        />
      </div>

      <div className="pointer-events-none absolute inset-x-0 top-0 z-[2] flex items-center justify-between px-4 py-3 text-sm text-white/90">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onClose();
          }}
          className="pointer-events-auto rounded border border-white/30 px-3 py-1.5 hover:border-moon-gold/60 hover:text-moon-gold"
        >
          {lettersCopy.manuscriptClose}
        </button>
        {total > 1 ? (
          <p className="tracking-widest text-white/80">
            {safeIndex + 1}/{total}
          </p>
        ) : (
          <span />
        )}
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            resetZoom();
          }}
          className="pointer-events-auto rounded border border-white/30 px-3 py-1.5 hover:border-moon-gold/60 hover:text-moon-gold"
        >
          重置缩放
        </button>
      </div>

      {total > 1 ? (
        <>
          <button
            type="button"
            aria-label="上一页"
            onClick={(event) => {
              event.stopPropagation();
              goTo(safeIndex - 1);
            }}
            className="absolute left-2 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/30 bg-black/55 px-3 py-2 text-lg text-white/95 sm:left-4"
          >
            ‹
          </button>
          <button
            type="button"
            aria-label="下一页"
            onClick={(event) => {
              event.stopPropagation();
              goTo(safeIndex + 1);
            }}
            className="absolute right-2 top-1/2 z-[2] -translate-y-1/2 rounded-full border border-white/30 bg-black/55 px-3 py-2 text-lg text-white/95 sm:right-4"
          >
            ›
          </button>
        </>
      ) : null}

      <div className="pointer-events-none absolute inset-x-0 bottom-0 z-[2] px-4 pb-5 pt-2 text-center">
        {total > 1 ? (
          <p className="text-sm tracking-widest text-white/85">
            {safeIndex + 1}/{total}
          </p>
        ) : null}
        <p className="mt-1 text-xs text-white/50">
          {total > 1
            ? "点击图片翻下一页 · 点击外部关闭"
            : "点击图片外关闭"}
        </p>
      </div>
    </div>
  );
}

function letterIndexTitle(letter: Letter) {
  const parts = letter.date.split("-");
  if (parts.length < 2) return letter.date;
  return parts.slice(1).join("-").trim();
}

export default function ClientLetters() {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [galleryOpen, setGalleryOpen] = useState(false);
  /** 关闭弹窗后仍保留高亮，不与 activeId 绑定清除 */
  const [highlightedStarId, setHighlightedStarId] = useState<string | null>(
    null,
  );
  const [focusRequest, setFocusRequest] = useState<{
    letterId: string;
    nonce: number;
  } | null>(null);
  const pendingFocusIdRef = useRef<string | null>(null);

  const [sheetLetter, setSheetLetter] = useState<Letter | null>(null);
  const [sheetPhase, setSheetPhase] = useState<"enter" | "open" | "exit">(
    "enter",
  );
  const closeAnimTimerRef = useRef(0);

  const activeLetter: Letter | null = useMemo(() => {
    if (!activeId) return null;
    return letters.find((letter) => letter.id === activeId) ?? null;
  }, [activeId]);

  useEffect(() => {
    setGalleryOpen(false);
  }, [activeId]);

  useEffect(() => {
    if (!activeLetter) return;
    window.clearTimeout(closeAnimTimerRef.current);
    setSheetLetter(activeLetter);
    setSheetPhase("enter");
    let raf2 = 0;
    const raf1 = window.requestAnimationFrame(() => {
      raf2 = window.requestAnimationFrame(() => setSheetPhase("open"));
    });
    return () => {
      window.cancelAnimationFrame(raf1);
      window.cancelAnimationFrame(raf2);
    };
  }, [activeLetter]);

  useEffect(() => {
    return () => window.clearTimeout(closeAnimTimerRef.current);
  }, []);

  function handleCloseCard() {
    setGalleryOpen(false);
    if (!sheetLetter) {
      setActiveId(null);
      return;
    }
    setSheetPhase("exit");
    window.clearTimeout(closeAnimTimerRef.current);
    closeAnimTimerRef.current = window.setTimeout(() => {
      setActiveId(null);
      setSheetLetter(null);
      setSheetPhase("enter");
    }, 280);
  }

  function handleOpenLetter(letterId: string) {
    // 直接点信星：取消进行中的索引导航任务
    window.clearTimeout(closeAnimTimerRef.current);
    pendingFocusIdRef.current = null;
    setFocusRequest(null);
    setHighlightedStarId(letterId);
    if (activeId === letterId) {
      const letter =
        letters.find((item) => item.id === letterId) ?? sheetLetter;
      if (letter) {
        setSheetLetter(letter);
        setSheetPhase("enter");
        window.requestAnimationFrame(() => {
          window.requestAnimationFrame(() => setSheetPhase("open"));
        });
      }
      return;
    }
    setActiveId(letterId);
  }

  function handleIndexClick(letterId: string) {
    // 以最新点击为准，取消上一封待打开（切换时跳过关闭动画）
    window.clearTimeout(closeAnimTimerRef.current);
    setGalleryOpen(false);
    setSheetLetter(null);
    setSheetPhase("enter");
    setActiveId(null);
    setHighlightedStarId(letterId);
    pendingFocusIdRef.current = letterId;
    setFocusRequest({ letterId, nonce: Date.now() });
  }

  function handleFocusComplete(letterId: string) {
    if (pendingFocusIdRef.current !== letterId) return;
    pendingFocusIdRef.current = null;
    setFocusRequest(null);
    setHighlightedStarId(letterId);
    setActiveId(letterId);
  }

  const manuscriptImages = sheetLetter?.images ?? [];
  const hasManuscript = manuscriptImages.length > 0;
  /** 关闭动画期间保持变暗，结束后再按现有逻辑恢复旋转 */
  const galaxyDimmed = Boolean(sheetLetter);
  const [meteorKey, setMeteorKey] = useState(0);

  useEffect(() => {
    if (galaxyDimmed) return;
    let cancelled = false;
    let timer = 0;
    const schedule = () => {
      const delay = 8000 + Math.random() * 7000;
      timer = window.setTimeout(() => {
        if (cancelled) return;
        setMeteorKey((key) => key + 1);
        schedule();
      }, delay);
    };
    schedule();
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [galaxyDimmed]);

  return (
    <main
      className="relative z-10 min-h-dvh overflow-hidden"
      style={{ backgroundColor: "#050816" }}
    >
      <style>{`
        .letter-paper {
          position: relative;
          width: 100%;
          max-width: 25.5rem;
          max-height: 70vh;
          display: flex;
          flex-direction: column;
          padding: 1.35rem 1.4rem 1.15rem;
          text-align: left;
          color: #3d3429;
          background-color: #fdf6e3;
          background-image:
            linear-gradient(
              135deg,
              rgba(255, 252, 245, 0.55) 0%,
              transparent 42%,
              rgba(210, 185, 140, 0.08) 100%
            );
          border: 1px solid rgba(180, 150, 100, 0.28);
          border-radius: 16px 18px 15px 17px;
          box-shadow:
            inset 0 0 0 1px rgba(255, 250, 235, 0.55),
            inset 0 0 0 2px rgba(180, 150, 100, 0.12),
            0 10px 36px rgba(11, 6, 32, 0.28),
            0 2px 10px rgba(80, 60, 30, 0.08);
          opacity: 0;
          transform: translateY(18px) scale(0.92) rotate(-1.8deg);
          filter: blur(5px);
          transition:
            opacity 0.42s cubic-bezier(0.22, 1, 0.36, 1),
            transform 0.42s cubic-bezier(0.22, 1, 0.36, 1),
            filter 0.42s cubic-bezier(0.22, 1, 0.36, 1);
        }
        .letter-modal-backdrop.is-open .letter-paper {
          opacity: 1;
          transform: translateY(0) scale(1) rotate(-0.55deg);
          filter: blur(0);
        }
        .letter-modal-backdrop.is-closing .letter-paper {
          opacity: 0;
          transform: translateY(14px) scale(0.94) rotate(-1.4deg);
          filter: blur(4px);
          transition-duration: 0.26s;
          transition-timing-function: ease-in;
        }
        .letter-paper-stamp {
          pointer-events: none;
          position: absolute;
          top: 0.7rem;
          right: 0.85rem;
          width: 1.55rem;
          height: 1.55rem;
          opacity: 0.22;
          color: #8a7348;
          font-size: 1.35rem;
          line-height: 1;
          user-select: none;
        }
        .letter-paper-group {
          opacity: 0;
          transition: opacity 0.32s ease;
        }
        .letter-modal-backdrop.is-open .letter-paper-group-1 {
          opacity: 1;
          transition-delay: 0.06s;
        }
        .letter-modal-backdrop.is-open .letter-paper-group-2 {
          opacity: 1;
          transition-delay: 0.12s;
        }
        .letter-modal-backdrop.is-open .letter-paper-group-3 {
          opacity: 1;
          transition-delay: 0.18s;
        }
        .letter-modal-backdrop.is-closing .letter-paper-group {
          opacity: 0;
          transition-delay: 0s;
          transition-duration: 0.18s;
        }
        .letter-paper-btn-primary {
          display: block;
          width: 100%;
          margin-top: 1.15rem;
          padding: 0.55rem 1.1rem;
          border-radius: 9999px;
          border: 1px solid rgba(196, 165, 116, 0.55);
          background: rgba(245, 234, 208, 0.72);
          color: #6b5a3e;
          font-size: 0.875rem;
          letter-spacing: 0.02em;
          cursor: pointer;
          transition: background-color 0.2s ease, border-color 0.2s ease;
        }
        .letter-paper-btn-primary:hover {
          background: rgba(239, 224, 192, 0.9);
          border-color: rgba(196, 165, 116, 0.75);
        }
        .letter-paper-btn-close {
          display: block;
          width: 100%;
          margin-top: 0.45rem;
          padding: 0.4rem 0.75rem;
          border: none;
          border-radius: 8px;
          background: transparent;
          color: rgba(107, 90, 62, 0.62);
          font-size: 0.8125rem;
          cursor: pointer;
          transition: color 0.2s ease, background-color 0.2s ease;
        }
        .letter-paper-btn-close:hover {
          color: rgba(107, 90, 62, 0.92);
          background: rgba(180, 150, 100, 0.08);
        }
        .letter-modal-backdrop {
          position: fixed;
          inset: 0;
          z-index: 40;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.25rem;
          background: rgba(5, 8, 22, 0.7);
          opacity: 0;
          transition: opacity 0.2s ease;
        }
        .letter-modal-backdrop.is-open {
          opacity: 1;
        }
        .letter-modal-backdrop.is-closing {
          opacity: 0;
          transition-duration: 0.26s;
        }
        @media (prefers-reduced-motion: reduce) {
          .letter-paper {
            transform: rotate(-0.55deg) !important;
            filter: none !important;
            transition: opacity 0.28s ease !important;
          }
          .letter-modal-backdrop.is-closing .letter-paper {
            transform: rotate(-0.55deg) !important;
          }
          .letter-paper-group {
            transition-delay: 0s !important;
          }
          .letter-modal-backdrop,
          .letters-ambient,
          .letter-galaxy-3d,
          .letter-galaxy-fallback {
            transition-duration: 0.2s !important;
          }
        }
        .letter-paper-scroll {
          --letter-line: 36px;
          background-image: repeating-linear-gradient(
            to bottom,
            transparent 0,
            transparent calc(var(--letter-line) * 0.78),
            rgba(180, 160, 120, 0.38) calc(var(--letter-line) * 0.78),
            rgba(180, 160, 120, 0.38) calc(var(--letter-line) * 0.78 + 1px),
            transparent calc(var(--letter-line) * 0.78 + 1px),
            transparent var(--letter-line)
          );
          background-size: 100% var(--letter-line);
          background-position: 0 0;
          background-attachment: local;
        }
        .letter-paper-body,
        .letter-paper-body p,
        .letter-paper-greeting,
        .letter-paper-paragraph,
        .letter-paper-signature,
        .letter-paper-signature p,
        .letter-paper-date {
          font-family: "LXGW WenKai", "Kaiti SC", "STKaiti", "KaiTi", cursive !important;
          letter-spacing: 1px;
        }
        .letter-paper-body {
          font-size: 15px;
          line-height: var(--letter-line, 36px);
        }
        @media (min-width: 768px) {
          .letter-paper-body {
            font-size: 16px;
          }
        }
        .letter-paper-greeting,
        .letter-paper-paragraph {
          line-height: var(--letter-line, 36px);
          margin: 0;
        }
        .letter-paper-greeting {
          text-indent: 0;
        }
        .letter-paper-paragraph {
          text-indent: 2em;
        }
        .letter-paper-gap {
          height: var(--letter-line, 36px);
        }
        .letter-paper-signature {
          margin-top: var(--letter-line, 36px);
          text-align: right;
          line-height: var(--letter-line, 36px);
        }
        .letter-paper-signature p {
          margin: 0;
          text-indent: 0;
          line-height: var(--letter-line, 36px);
        }
        .letter-paper-date {
          color: #6b5a3e;
        }

        .letters-ambient {
          pointer-events: none;
          position: absolute;
          inset: 0;
          z-index: 5;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }
        .letters-ambient.is-dimmed {
          opacity: 0.28;
        }
        .letters-ambient.is-dimmed .letters-meteor {
          animation: none !important;
          opacity: 0 !important;
        }
        .letters-nebula {
          pointer-events: none;
          position: absolute;
          filter: blur(52px);
        }
        .letters-nebula-left {
          left: -12%;
          top: 4%;
          width: 52%;
          height: 48%;
          background: radial-gradient(
            ellipse 70% 60% at 40% 45%,
            rgba(110, 100, 190, 0.11),
            transparent 72%
          );
          opacity: 0.9;
        }
        .letters-nebula-right {
          right: -10%;
          bottom: 2%;
          width: 48%;
          height: 46%;
          background:
            radial-gradient(
              ellipse 65% 55% at 55% 50%,
              rgba(130, 95, 180, 0.09),
              transparent 70%
            ),
            radial-gradient(
              ellipse 40% 35% at 70% 40%,
              rgba(200, 170, 110, 0.05),
              transparent 68%
            );
          opacity: 0.85;
        }
        .letters-constellation {
          pointer-events: none;
          position: absolute;
          z-index: 1;
          opacity: 0.11;
          mix-blend-mode: screen;
          filter: brightness(0.95) hue-rotate(210deg) saturate(0.7);
          user-select: none;
          -webkit-user-drag: none;
        }
        .letters-constellation-cancer {
          left: 2%;
          bottom: 6%;
          width: min(34vw, 360px);
          animation: letters-constellation-float-a 8.5s ease-in-out infinite;
        }
        .letters-constellation-libra {
          right: 3%;
          top: 12%;
          width: min(30vw, 320px);
          animation: letters-constellation-float-b 9.5s ease-in-out infinite;
        }
        @keyframes letters-constellation-float-a {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-6px); }
        }
        @keyframes letters-constellation-float-b {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(7px); }
        }
        @media (max-width: 768px) {
          .letters-constellation-cancer {
            width: min(42vw, 200px);
            left: 1%;
            bottom: 4%;
            opacity: 0.08;
          }
          .letters-constellation-libra {
            width: min(36vw, 170px);
            right: 1%;
            top: 14%;
            opacity: 0.07;
          }
        }
        @media (max-width: 420px) {
          .letters-constellation-libra {
            display: none;
          }
          .letters-constellation-cancer {
            width: min(48vw, 160px);
            opacity: 0.06;
          }
        }
        .letters-ambient-star {
          pointer-events: none;
          position: absolute;
          border-radius: 9999px;
          background: rgba(230, 225, 255, 0.9);
          transform: translate(-50%, -50%);
        }
        .letters-meteor {
          pointer-events: none;
          position: absolute;
          top: 8%;
          left: -8%;
          width: 120px;
          height: 1px;
          background: linear-gradient(
            to right,
            transparent,
            rgba(255, 248, 230, 0.55) 40%,
            rgba(200, 190, 255, 0.15)
          );
          transform: rotate(28deg);
          opacity: 0;
          animation: letters-meteor-fly 1.25s ease-out forwards;
        }
        @keyframes letters-meteor-fly {
          0% {
            opacity: 0;
            transform: rotate(28deg) translate(-20px, -10px);
          }
          12% {
            opacity: 0.55;
          }
          100% {
            opacity: 0;
            transform: rotate(28deg) translate(110vw, 58vh);
          }
        }

        .letter-galaxy-3d,
        .letter-galaxy-fallback {
          position: absolute;
          inset: 0;
          z-index: 15;
          overflow: hidden;
          transition: opacity 0.2s ease;
        }
        .letter-galaxy-3d-canvas {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        .letter-galaxy-3d-canvas canvas {
          pointer-events: none !important;
        }
        .letter-galaxy-3d-drag {
          position: absolute;
          left: 0;
          right: 0;
          top: 18%;
          bottom: 0;
          z-index: 1;
          cursor: grab;
          touch-action: none;
        }
        .letter-galaxy-3d-drag:active {
          cursor: grabbing;
        }
        .letter-galaxy-3d-hits {
          position: absolute;
          inset: 0;
          z-index: 2;
          pointer-events: none;
        }
        .letter-galaxy-fallback-img {
          pointer-events: none;
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .letter-galaxy-hit {
          pointer-events: auto;
          position: absolute;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 44px;
          height: 44px;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          transform: translate(-50%, -50%);
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
        }
        .letter-galaxy-hit-core {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #ffffff;
          box-shadow:
            0 0 4px 1px rgba(255, 247, 214, 0.95),
            0 0 12px 3px rgba(246, 223, 154, 0.45);
        }
        .letter-galaxy-hit.is-active .letter-galaxy-hit-core {
          box-shadow:
            0 0 0 1px rgba(246, 223, 154, 0.9),
            0 0 0 4px rgba(246, 223, 154, 0.25),
            0 0 12px 3px rgba(246, 223, 154, 0.5);
          animation: letter-galaxy-hit-breathe 2.6s ease-in-out infinite;
        }
        @keyframes letter-galaxy-hit-breathe {
          0%,
          100% {
            transform: scale(1);
            opacity: 1;
          }
          50% {
            transform: scale(1.22);
            opacity: 0.88;
          }
        }
        .letter-galaxy-hit-tip {
          pointer-events: none;
          position: absolute;
          left: 50%;
          bottom: calc(100% + 8px);
          transform: translateX(-50%) translateY(4px);
          white-space: nowrap;
          max-width: min(52vw, 220px);
          overflow: hidden;
          text-overflow: ellipsis;
          padding: 4px 8px;
          border-radius: 6px;
          background: rgba(5, 8, 22, 0.9);
          border: 1px solid rgba(246, 223, 154, 0.32);
          color: #fff7d6;
          font-size: 11px;
          opacity: 0;
          transition: opacity 0.2s ease, transform 0.2s ease;
        }
        .letter-galaxy-hit:hover .letter-galaxy-hit-tip,
        .letter-galaxy-hit:focus-visible .letter-galaxy-hit-tip {
          opacity: 1;
          transform: translateX(-50%) translateY(0);
        }
        .letter-galaxy-hit.is-pulse .letter-galaxy-hit-core {
          animation: letter-galaxy-hit-pulse 0.9s ease-out;
        }
        @keyframes letter-galaxy-hit-pulse {
          0% {
            transform: scale(1);
          }
          35% {
            transform: scale(1.85);
            box-shadow:
              0 0 4px 2px rgba(255, 236, 180, 1),
              0 0 16px 5px rgba(246, 210, 130, 0.65),
              0 0 26px 9px rgba(232, 190, 110, 0.32);
          }
          100% {
            transform: scale(1);
          }
        }

        /* 桌面端信件索引；移动端预留隐藏，后续可改布局 */
        .letters-index-nav {
          display: none;
          position: absolute;
          left: 28px;
          top: 112px;
          bottom: 30%;
          z-index: 22;
          width: 128px;
          max-width: 150px;
          transform: none;
          padding: 8px 6px;
          border: none;
          border-radius: 0;
          background: transparent;
          box-shadow: none;
          backdrop-filter: none;
          -webkit-backdrop-filter: none;
          overflow-y: auto;
          overflow-x: hidden;
          pointer-events: auto;
        }
        @media (min-width: 768px) {
          .letters-index-nav {
            display: block;
          }
        }
        .letters-index-list {
          list-style: none;
          margin: 0;
          padding: 0;
        }
        .letters-index-item {
          margin: 0;
          padding: 0;
        }
        .letters-index-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          width: 100%;
          max-width: 100%;
          height: 36px;
          margin: 0;
          padding: 0 4px;
          border: none;
          border-radius: 4px;
          background: transparent;
          color: rgba(228, 220, 255, 0.56);
          font-size: 13px;
          line-height: 36px;
          text-align: left;
          cursor: pointer;
          appearance: none;
          -webkit-appearance: none;
          text-shadow:
            0 0 10px rgba(5, 8, 22, 0.85),
            0 1px 2px rgba(5, 8, 22, 0.7);
          transition: color 0.2s ease, background-color 0.2s ease,
            text-shadow 0.2s ease;
        }
        .letters-index-btn:hover {
          color: rgba(240, 234, 255, 0.92);
          background: rgba(255, 255, 255, 0.03);
          text-shadow:
            0 0 12px rgba(5, 8, 22, 0.9),
            0 0 8px rgba(200, 190, 255, 0.22);
        }
        .letters-index-btn:focus-visible {
          outline: 1px solid rgba(246, 223, 154, 0.35);
          outline-offset: 1px;
          color: rgba(240, 234, 255, 0.95);
          background: transparent;
        }
        .letters-index-btn.is-current {
          color: rgba(246, 220, 160, 0.94);
          background: transparent;
          text-shadow:
            0 0 12px rgba(5, 8, 22, 0.88),
            0 0 10px rgba(246, 210, 130, 0.28);
        }
        .letters-index-btn.is-current:hover {
          color: rgba(255, 232, 180, 0.98);
          background: rgba(246, 220, 160, 0.04);
        }
        .letters-index-dot {
          flex-shrink: 0;
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: transparent;
          box-shadow: none;
        }
        .letters-index-btn.is-current .letters-index-dot {
          background: rgba(246, 220, 160, 0.95);
          box-shadow:
            0 0 5px 1px rgba(246, 210, 130, 0.7),
            0 0 10px 2px rgba(232, 190, 110, 0.35);
        }
        .letters-index-label {
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }
      `}</style>

      <div
        className={`letters-ambient${galaxyDimmed ? " is-dimmed" : ""}`}
        aria-hidden
      >
        <div className="letters-nebula letters-nebula-left" />
        <div className="letters-nebula letters-nebula-right" />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/cancer-outline.png"
          alt=""
          className="letters-constellation letters-constellation-cancer"
          draggable={false}
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/libra-outline.png"
          alt=""
          className="letters-constellation letters-constellation-libra"
          draggable={false}
        />
        {LETTERS_AMBIENT_STARS.map((star) => (
          <span
            key={star.id}
            className="letters-ambient-star"
            style={{
              left: `${star.left}%`,
              top: `${star.top}%`,
              width: star.size,
              height: star.size,
              opacity: star.opacity,
            }}
          />
        ))}
        {!galaxyDimmed && meteorKey > 0 ? (
          <span key={meteorKey} className="letters-meteor" />
        ) : null}
      </div>

      <Link
        href={lettersCopy.homeHref}
        className="absolute left-5 top-5 z-30 text-sm text-primary-light underline-offset-4 hover:text-moon-gold hover:underline sm:left-8 sm:top-8 landscape:top-14"
      >
        {lettersCopy.backHome}
      </Link>

      <h1 className="pointer-events-none absolute left-1/2 top-16 z-20 -translate-x-1/2 font-display text-xl text-moon-gold sm:text-2xl landscape:top-14">
        {lettersCopy.title}
      </h1>

      <nav
        className="letters-index-nav"
        aria-label="信件索引"
        data-mobile-layout="hidden-for-now"
      >
        <ul className="letters-index-list">
          {letters.map((letter, index) => {
            const title = letterIndexTitle(letter);
            const ordinal = String(index + 1).padStart(2, "0");
            const isCurrent = highlightedStarId === letter.id;
            return (
              <li key={letter.id} className="letters-index-item">
                <button
                  type="button"
                  className={`letters-index-btn${isCurrent ? " is-current" : ""}`}
                  aria-label={`定位并打开信件：${ordinal} ${title}`}
                  aria-current={isCurrent ? "true" : undefined}
                  onClick={() => handleIndexClick(letter.id)}
                >
                  <span className="letters-index-dot" aria-hidden />
                  <span className="letters-index-label">
                    {ordinal} {title}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </nav>

      <LetterGalaxy
        highlightedStarId={highlightedStarId}
        dimmed={galaxyDimmed}
        onOpenLetter={handleOpenLetter}
        focusRequest={focusRequest}
        onFocusComplete={handleFocusComplete}
      />

      {sheetLetter ? (
        <div
          className={`letter-modal-backdrop${
            sheetPhase === "open"
              ? " is-open"
              : sheetPhase === "exit"
                ? " is-closing"
                : ""
          }`}
          role="presentation"
          onClick={handleCloseCard}
        >
          <div
            className="letter-paper scrollbar-hide"
            role="dialog"
            aria-modal="true"
            aria-label={sheetLetter.date}
            onClick={(event) => event.stopPropagation()}
          >
            <span className="letter-paper-stamp" aria-hidden>
              ✦
            </span>
            <p className="letter-paper-date letter-paper-group letter-paper-group-1 shrink-0 text-sm font-medium md:text-base">
              {sheetLetter.date}
            </p>
            <div className="letter-paper-scroll letter-paper-group letter-paper-group-2 scrollbar-hide mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
              <LetterPaperBody content={sheetLetter.content} />
            </div>

            <div className="letter-paper-group letter-paper-group-3 shrink-0">
              {hasManuscript ? (
                <button
                  type="button"
                  onClick={() => setGalleryOpen(true)}
                  className="letter-paper-btn-primary"
                >
                  {lettersCopy.viewManuscript}
                </button>
              ) : null}

              <button
                type="button"
                onClick={handleCloseCard}
                className="letter-paper-btn-close"
              >
                {lettersCopy.closeLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {galleryOpen && hasManuscript ? (
        <ManuscriptGallery
          images={manuscriptImages}
          onClose={() => setGalleryOpen(false)}
        />
      ) : null}
    </main>
  );
}
