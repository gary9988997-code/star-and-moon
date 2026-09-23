"use client";

import { useId } from "react";

type MoonPhaseProps = {
  /** 0 = 新月，1 = 满月；由打字进度驱动 */
  progress: number;
  className?: string;
};

/** 轻量 CSS/SVG 月相，不使用 cutemoon.png */
export default function MoonPhase({
  progress,
  className = "",
}: MoonPhaseProps) {
  const uid = useId().replace(/:/g, "");
  const glowId = `letterMoonGlow-${uid}`;
  const maskId = `letterMoonMask-${uid}`;
  const p = Math.min(1, Math.max(0, progress));
  // 遮罩圆水平偏移：新月几乎完全遮住，满月移出
  const shadeX = (0.5 - p) * 2;

  return (
    <div
      className={className}
      role="img"
      aria-label={`月相进度 ${Math.round(p * 100)}%`}
    >
      <svg viewBox="0 0 64 64" width="100%" height="100%" aria-hidden>
        <defs>
          <radialGradient id={glowId} cx="35%" cy="32%" r="65%">
            <stop offset="0%" stopColor="#fff8e8" />
            <stop offset="55%" stopColor="#f0d9a0" />
            <stop offset="100%" stopColor="#c9a86a" />
          </radialGradient>
          <mask id={maskId}>
            <rect width="64" height="64" fill="#000" />
            <circle cx="32" cy="32" r="22" fill="#fff" />
            <circle cx={32 + shadeX * 28} cy="32" r="22" fill="#000" />
          </mask>
        </defs>
        <circle
          cx="32"
          cy="32"
          r="24"
          fill="none"
          stroke="rgba(251, 191, 36, 0.18)"
          strokeWidth="1"
        />
        <circle
          cx="32"
          cy="32"
          r="22"
          fill={`url(#${glowId})`}
          mask={`url(#${maskId})`}
        />
      </svg>
    </div>
  );
}
