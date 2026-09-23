"use client";

import Link from "next/link";
import { useState } from "react";
import { journeyCopy, journeyStops } from "@/data/journey";

/** 预留：未来镜头拉近 / 城市放大用的舞台状态（当前不执行动画） */
type EarthStageMode = "idle" | "zooming";

export default function JourneyPage() {
  const [stopIndex, setStopIndex] = useState<number | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  // 预留状态：仅挂 class，暂不切换到 zooming
  const [earthStageMode] = useState<EarthStageMode>("idle");

  /** 核心逻辑保持：点地球/屏幕 → 下一站并弹出卡片 */
  function handleScreenTap() {
    setStopIndex((prev) => {
      if (prev === null) return 0;
      return (prev + 1) % journeyStops.length;
    });
    setPhotoIndex(0);
    setCardOpen(true);
  }

  function handleCloseCard() {
    setCardOpen(false);
  }

  const activeStop =
    cardOpen && stopIndex !== null ? journeyStops[stopIndex] : null;
  const photos = activeStop?.photos ?? [];
  const safePhotoIndex =
    photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;

  return (
    <main
      className="relative z-10 min-h-dvh cursor-pointer overflow-y-auto safe-px safe-py pb-28"
      onClick={handleScreenTap}
      role="presentation"
    >
      <Link
        href={journeyCopy.homeHref}
        onClick={(event) => event.stopPropagation()}
        className="absolute left-5 top-5 z-30 text-sm text-primary-light underline-offset-4 hover:text-moon-gold hover:underline sm:left-8 sm:top-8 landscape:top-14"
      >
        {journeyCopy.backHome}
      </Link>

      {/*
        响应式分区：
        - 移动端：上地球 / 下卡片（纵向）
        - 桌面端：左地球 / 右卡片（横向）
        允许整页滚动，避免互相遮挡
      */}
      <div
        className={`mx-auto flex w-full max-w-6xl flex-col gap-8 pt-16 md:min-h-[calc(100dvh-5rem)] md:flex-row md:items-start md:justify-between md:gap-10 md:pt-20 ${
          activeStop ? "" : "min-h-[70dvh] justify-center md:items-center"
        }`}
      >
        {/* 未来可以在这里添加镜头拉近和城市放大动画 */}
        <div
          className={`earth-stage z-0 flex w-full shrink-0 flex-col items-center justify-center md:sticky md:top-24 md:w-[46%] ${
            earthStageMode === "zooming"
              ? "earth-stage--zooming"
              : "earth-stage--idle"
          }`}
        >
          <div
            className="earth-spin h-[220px] w-[220px] rounded-full sm:h-[280px] sm:w-[280px] md:h-[360px] md:w-[360px] lg:h-[400px] lg:w-[400px]"
            style={{
              background: "linear-gradient(145deg, #1E3A8A 0%, #3B82F6 100%)",
            }}
            aria-hidden
          />
          <p className="mt-5 text-center text-sm text-[var(--text)]/80 [text-shadow:0_1px_8px_rgba(11,6,32,0.9)]">
            {journeyCopy.hint}
          </p>
        </div>

        {/* 卡片区：独立一列，不覆盖地球主体 */}
        <div className="z-10 w-full md:w-[50%]">
          {activeStop ? (
            <div
              className="scrollbar-hide max-h-none w-full overflow-y-auto border-none bg-transparent p-2 text-left sm:p-4 md:max-h-[calc(100dvh-6rem)]"
              onClick={(event) => event.stopPropagation()}
              role="dialog"
              aria-label={activeStop.city}
            >
              {/* 顶部：城市 / 标题 / 描述 */}
              <p className="text-base font-bold text-primary-light [text-shadow:0_1px_8px_rgba(11,6,32,0.9),0_0_12px_rgba(11,6,32,0.7)] md:text-lg">
                {activeStop.city}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold leading-snug text-moon-gold [text-shadow:0_1px_10px_rgba(11,6,32,0.95),0_0_14px_rgba(11,6,32,0.75)] md:text-2xl">
                {activeStop.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--text)]/90 [text-shadow:0_1px_8px_rgba(11,6,32,0.9),0_0_12px_rgba(11,6,32,0.7)] md:text-lg md:leading-7">
                {activeStop.summary}
              </p>

              {/* 下方：点击图片切下一张 + 右下角页码 */}
              {photos.length > 0 ? (
                <div className="relative mt-4">
                  <div className="flex h-[32vh] w-full items-start justify-center overflow-hidden transition-[height] duration-300 ease-out md:h-[45vh]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={photos[safePhotoIndex]}
                      alt={`${activeStop.city} 照片 ${safePhotoIndex + 1}`}
                      className={`max-h-full max-w-full object-contain object-top drop-shadow-[0_8px_24px_rgba(11,6,32,0.65)] ${
                        photos.length > 1 ? "cursor-pointer" : ""
                      }`}
                      onClick={() => {
                        if (photos.length <= 1) return;
                        setPhotoIndex((prev) => (prev + 1) % photos.length);
                      }}
                    />
                  </div>
                  {photos.length > 1 ? (
                    <span className="pointer-events-none absolute bottom-2 right-2 text-xs text-[var(--text)]/90 [text-shadow:0_1px_6px_rgba(11,6,32,0.95)]">
                      {safePhotoIndex + 1}/{photos.length}
                    </span>
                  ) : null}
                </div>
              ) : null}

              <button
                type="button"
                onClick={handleCloseCard}
                className="mt-4 w-full border border-moon-gold/50 bg-transparent px-4 py-2 text-sm text-moon-gold [text-shadow:0_1px_8px_rgba(11,6,32,0.9)]"
              >
                {journeyCopy.closeLabel}
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
