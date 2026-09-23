"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent, type PointerEvent, type TouchEvent } from "react";
import { createRoot, type Root } from "react-dom/client";
import type { GlobeMethods } from "react-globe.gl";
import { journeyCopy, journeyData, journeyStops } from "@/data/journey";

const JourneyGlobe = dynamic(() => import("@/components/GlobeWrapper"), {
  ssr: false,
});

const FLY_MS = 1500;
const REST_POV = { lat: 20, lng: 0, altitude: 2.5 };
const PAST_COUNT = 11;
const PHOTO_HOLD_MS = 3500;
const PHOTO_FADE_MS = 1000;

type GlobePoint = {
  lat: number;
  lng: number;
  index: number;
  isPast: boolean;
  city: string;
  title: string;
  photo: string;
};

/** 光点上方常显气泡（JSX）；定位完全交给 react-globe 的 lat/lng 投影 */
function GlobeCityBubble({
  point,
  onOpen,
  selected,
}: {
  point: GlobePoint;
  onOpen: (point: GlobePoint) => void;
  selected: boolean;
}) {
  const isPast = point.index < PAST_COUNT;
  const dotColor = isPast ? "#FBBF24" : "#A78BFA";
  const borderColor = isPast
    ? "rgba(251, 191, 36, 0.7)"
    : "rgba(167, 139, 250, 0.7)";
  const cityColor = isPast ? "#FBBF24" : "#A78BFA";
  const titleColor = isPast ? "#E8D5A8" : "#D8CFFF";
  const glow = isPast
    ? "0 0 12px rgba(251, 191, 36, 0.25)"
    : "0 0 12px rgba(139, 92, 246, 0.3)";
  const selectedGlow = isPast
    ? "0 0 20px rgba(251, 191, 36, 0.55), 0 0 8px rgba(251, 191, 36, 0.4)"
    : "0 0 20px rgba(139, 92, 246, 0.6), 0 0 8px rgba(167, 139, 250, 0.45)";
  // 轻微上下错开，减轻邻近城市重叠
  const staggerY = ((point.index % 3) - 1) * 10;

  function handleOpen(event: MouseEvent | PointerEvent | TouchEvent) {
    event.stopPropagation();
    event.preventDefault();
    onOpen(point);
  }

  function liftHost(host: HTMLElement | null, lift: boolean) {
    if (host) host.style.zIndex = lift ? "9999" : "1";
  }

  return (
    <div
      className={`globe-city-marker${selected ? " is-selected" : ""}`}
      style={{ transform: `translateY(${staggerY}px)` }}
      ref={(node) => {
        // 选中时抬高 CSS2D 宿主，才能盖过邻近城市
        liftHost(node?.parentElement ?? null, selected);
      }}
      onMouseEnter={(event) => {
        liftHost(event.currentTarget.parentElement, true);
      }}
      onMouseLeave={(event) => {
        if (selected) return;
        liftHost(event.currentTarget.parentElement, false);
      }}
    >
      <button
        type="button"
        className={`globe-city-bubble-panel${isPast ? " is-past" : " is-future"}${selected ? " is-selected" : ""}`}
        onClick={handleOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
        style={{
          border: `1px solid ${borderColor}`,
          boxShadow: selected ? selectedGlow : glow,
          // CSS 变量供 ::after 三角取色
          ["--bubble-tail" as string]: borderColor,
        }}
      >
        <span className="globe-city-bubble-city" style={{ color: cityColor }}>
          {point.city}
        </span>
        <span className="globe-city-bubble-title" style={{ color: titleColor }}>
          {point.title}
        </span>
      </button>
      <button
        type="button"
        className="globe-city-dot"
        aria-label={point.city}
        onClick={handleOpen}
        onPointerDown={(event) => event.stopPropagation()}
        onMouseDown={(event) => event.stopPropagation()}
        onTouchStart={(event) => event.stopPropagation()}
      >
        <span
          className="globe-city-dot-core"
          style={{
            background: dotColor,
            boxShadow: `0 0 6px ${dotColor}, 0 0 10px ${dotColor}`,
          }}
        />
      </button>
    </div>
  );
}

export default function JourneyPage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const markerRootsRef = useRef<Root[]>([]);
  const [isMounted, setIsMounted] = useState(false);
  const [selectedCity, setSelectedCity] = useState<string | null>(null);
  const [stopIndex, setStopIndex] = useState<number | null>(null);
  const [cardOpen, setCardOpen] = useState(false);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [globeSize, setGlobeSize] = useState({ width: 360, height: 420 });

  const points = useMemo<GlobePoint[]>(
    () =>
      journeyData.map((item, index) => ({
        lat: item.lat,
        lng: item.lng,
        index,
        isPast: index < PAST_COUNT,
        city: item.city,
        title: item.title,
        photo: item.photos[0] ? `/images/journey/${item.photos[0]}` : "",
      })),
    [],
  );

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const syncGlobeSize = () => {
      const width = stage.clientWidth;
      const height = stage.clientHeight;
      if (width < 2 || height < 2) return;

      setGlobeSize((prev) =>
        prev.width === width && prev.height === height ? prev : { width, height },
      );

      const renderer = globeRef.current?.renderer();
      const canvas = renderer?.domElement;
      if (
        renderer &&
        canvas &&
        (canvas.clientWidth !== width || canvas.clientHeight !== height)
      ) {
        renderer.setSize(width, height, true);
      }
    };

    syncGlobeSize();
    const observer = new ResizeObserver(syncGlobeSize);
    observer.observe(stage);
    window.addEventListener("resize", syncGlobeSize);
    return () => {
      observer.disconnect();
      window.removeEventListener("resize", syncGlobeSize);
    };
  }, []);

  useEffect(() => {
    if (!cardOpen || stopIndex === null) return;
    const count = journeyStops[stopIndex]?.photos.length ?? 0;
    if (count <= 1) return;

    const timer = window.setInterval(() => {
      setPhotoIndex((prev) => (prev + 1) % count);
    }, PHOTO_HOLD_MS);

    return () => {
      window.clearInterval(timer);
    };
  }, [cardOpen, stopIndex]);

  function setAutoRotate(enabled: boolean) {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = enabled;
    controls.autoRotateSpeed = 0.5;
  }

  function handleGlobeReady() {
    globeRef.current?.pointOfView(REST_POV, 0);
    setAutoRotate(true);
  }

  useEffect(() => {
    return () => {
      markerRootsRef.current.forEach((root) => {
        window.setTimeout(() => root.unmount(), 0);
      });
      markerRootsRef.current = [];
    };
  }, []);

  const openCity = useCallback((point: GlobePoint) => {
    setSelectedCity(point.city);
    setAutoRotate(false);
    globeRef.current?.pointOfView(
      { lat: point.lat, lng: point.lng, altitude: 1.5 },
      FLY_MS,
    );
    setStopIndex(point.index);
    setPhotoIndex(0);
    setCardOpen(true);
  }, []);

  const htmlElement = useCallback(
    (datum: object) => {
      const point = datum as GlobePoint;
      // react-globe.gl 要求返回 HTMLElement，并由库根据 lat/lng 写入 transform
      const host = document.createElement("div");
      host.style.pointerEvents = "auto";
      // 不要在 host 上设置 position/top/left/transform，避免覆盖球面投影
      const root = createRoot(host);
      markerRootsRef.current[point.index] = root;
      root.render(
        <GlobeCityBubble point={point} onOpen={openCity} selected={false} />,
      );
      return host;
    },
    [openCity, "jsx-bubble-v7"],
  );

  // 气泡在 createRoot 里，需在 selectedCity 变化时主动重绘
  useEffect(() => {
    markerRootsRef.current.forEach((root, index) => {
      const point = points[index];
      if (!root || !point) return;
      root.render(
        <GlobeCityBubble
          point={point}
          onOpen={openCity}
          selected={selectedCity === point.city}
        />,
      );
    });
  }, [selectedCity, openCity, points]);

  function handleCloseCard() {
    setSelectedCity(null);
    setCardOpen(false);
    globeRef.current?.pointOfView(REST_POV, FLY_MS);
    window.setTimeout(() => setAutoRotate(true), FLY_MS);
  }

  const activeStop =
    cardOpen && stopIndex !== null ? journeyStops[stopIndex] : null;
  const photos = activeStop?.photos ?? [];
  const safePhotoIndex =
    photos.length > 0 ? Math.min(photoIndex, photos.length - 1) : 0;

  return (
    <main className="relative z-10 min-h-dvh overflow-y-auto safe-px safe-py pb-36 md:min-h-dvh md:overflow-hidden md:px-0 md:py-0">
      <style>{`
        @keyframes star-ring {
          0% { transform: translate(-50%, -50%) scale(1); opacity: 0.75; }
          100% { transform: translate(-50%, -50%) scale(3.6); opacity: 0; }
        }
        @keyframes star-breathe {
          0%, 100% { opacity: 0.45; }
          50% { opacity: 0.95; }
        }
        @keyframes star-core {
          0%, 100% { opacity: 0.82; filter: brightness(0.95); }
          50% { opacity: 1; filter: brightness(1.4); }
        }
        @keyframes journey-kenburns {
          from { transform: scale(1); }
          to { transform: scale(1.05); }
        }
        .journey-photo-slide {
          position: absolute;
          inset: 0;
          margin: auto;
          max-height: 100%;
          max-width: 100%;
          object-fit: contain;
          object-position: top;
          opacity: 0;
          pointer-events: none;
          transition: opacity ${PHOTO_FADE_MS}ms ease-in-out;
          filter: drop-shadow(0 8px 24px rgba(11, 6, 32, 0.65));
        }
        .journey-photo-slide.is-active {
          opacity: 1;
          pointer-events: none;
        }
        .globe-city-marker {
          display: flex;
          flex-direction: column;
          align-items: center;
          pointer-events: none;
        }
        .globe-city-bubble-panel {
          position: relative;
          pointer-events: auto;
          cursor: pointer;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 2px;
          margin: 0 0 8px;
          padding: 4px 10px;
          border-radius: 12px;
          background: rgba(11, 6, 32, 0.85);
          backdrop-filter: blur(8px);
          -webkit-backdrop-filter: blur(8px);
          font-size: 12px;
          line-height: 1.3;
          text-align: left;
          white-space: nowrap;
          appearance: none;
          -webkit-appearance: none;
          opacity: 0.75;
          transform: scale(1);
          transition: opacity 0.18s ease, transform 0.18s ease;
          z-index: 1;
        }
        .globe-city-bubble-panel::after {
          content: "";
          position: absolute;
          left: 50%;
          bottom: -5px;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 5px solid transparent;
          border-right: 5px solid transparent;
          border-top: 5px solid var(--bubble-tail, rgba(167, 139, 250, 0.7));
          pointer-events: none;
        }
        .globe-city-bubble-panel:hover {
          opacity: 1;
          transform: scale(1.08);
          z-index: 9999;
        }
        .globe-city-bubble-panel.is-selected,
        .globe-city-bubble-panel.is-selected:hover {
          opacity: 1;
          transform: scale(1.3);
          z-index: 9999;
        }
        .globe-city-bubble-city {
          font-weight: 700;
          white-space: nowrap;
        }
        .globe-city-bubble-title {
          font-weight: 400;
          font-size: 11px;
          white-space: nowrap;
        }
        .globe-city-dot {
          pointer-events: auto;
          cursor: pointer;
          width: 16px;
          height: 16px;
          margin: 0;
          padding: 0;
          border: none;
          background: transparent;
          appearance: none;
          -webkit-appearance: none;
        }
        .globe-city-dot-core {
          display: block;
          width: 6px;
          height: 6px;
          margin: 5px auto;
          border-radius: 50%;
        }
      `}</style>
      {/* 竖屏：上半屏地球。桌面：fixed 铺满，卡片开关不改变这块尺寸 */}
      <div
        ref={stageRef}
        className="earth-stage relative z-0 h-[46vh] w-full min-h-[320px] overflow-hidden md:fixed md:inset-0 md:z-0 md:h-auto md:min-h-0 md:w-auto md:overflow-visible"
        style={{
          backgroundColor: "#070318",
          backgroundImage: [
            "radial-gradient(1px 1px at 12% 18%, rgba(248,245,255,0.85), transparent)",
            "radial-gradient(1px 1px at 28% 42%, rgba(248,245,255,0.55), transparent)",
            "radial-gradient(1.5px 1.5px at 46% 14%, rgba(251,191,36,0.55), transparent)",
            "radial-gradient(1px 1px at 63% 31%, rgba(248,245,255,0.7), transparent)",
            "radial-gradient(1px 1px at 78% 22%, rgba(167,139,250,0.7), transparent)",
            "radial-gradient(1px 1px at 88% 48%, rgba(248,245,255,0.45), transparent)",
            "radial-gradient(1.5px 1.5px at 18% 68%, rgba(248,245,255,0.6), transparent)",
            "radial-gradient(1px 1px at 36% 78%, rgba(167,139,250,0.55), transparent)",
            "radial-gradient(1px 1px at 54% 62%, rgba(248,245,255,0.5), transparent)",
            "radial-gradient(1px 1px at 72% 74%, rgba(251,191,36,0.4), transparent)",
            "radial-gradient(1px 1px at 91% 81%, rgba(248,245,255,0.55), transparent)",
            "radial-gradient(1px 1px at 8% 88%, rgba(167,139,250,0.4), transparent)",
            "radial-gradient(ellipse 70% 55% at 50% 48%, rgba(139,92,246,0.22) 0%, transparent 68%)",
            "radial-gradient(ellipse 100% 90% at 50% 50%, #1A103D 0%, #070318 72%)",
          ].join(", "),
        }}
      >
        <div className="relative z-[1] h-full w-full">
          {isMounted ? (
            <JourneyGlobe
              globeRef={globeRef}
              autoRotate={true}
              autoRotateSpeed={0.5}
              width={globeSize.width}
              height={globeSize.height}
              backgroundColor="rgba(0,0,0,0)"
              globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
              atmosphereColor="#C084FC"
              atmosphereAltitude={0.25}
              htmlElementsData={points}
              htmlLat="lat"
              htmlLng="lng"
              htmlAltitude={0.01}
              htmlElement={htmlElement}
              onGlobeReady={handleGlobeReady}
            />
          ) : (
            <div className="h-full w-full" aria-hidden />
          )}
        </div>
        <p className="pointer-events-none absolute bottom-24 left-0 right-0 z-[3] text-center text-sm text-[var(--text)]/80 [text-shadow:0_1px_8px_rgba(11,6,32,0.9)] md:bottom-28">
          轻点城市，飞向这里
        </p>
      </div>

      {activeStop ? (
        <>
          <div
            className="fixed inset-0 z-[15]"
            aria-hidden
            onClick={handleCloseCard}
          />
          <div
            className="relative z-10 mt-4 w-full md:fixed md:right-4 md:top-1/2 md:z-20 md:mt-0 md:w-[min(28rem,40vw)] md:-translate-y-1/2"
            onClick={(event) => event.stopPropagation()}
          >
            <div
              className="scrollbar-hide max-h-none w-full overflow-y-auto border-none bg-transparent p-2 text-left sm:p-4 md:max-h-[calc(100dvh-6rem)]"
              role="dialog"
              aria-label={activeStop.city}
              onClick={(event) => event.stopPropagation()}
            >
              <p className="text-base font-bold text-primary-light [text-shadow:0_1px_8px_rgba(11,6,32,0.9),0_0_12px_rgba(11,6,32,0.7)] md:text-lg">
                {activeStop.city}
              </p>
              <h2 className="mt-2 font-display text-xl font-bold leading-snug text-moon-gold [text-shadow:0_1px_10px_rgba(11,6,32,0.95),0_0_14px_rgba(11,6,32,0.75)] md:text-2xl">
                {activeStop.title}
              </h2>
              <p className="mt-3 text-base leading-relaxed text-[var(--text)]/90 [text-shadow:0_1px_8px_rgba(11,6,32,0.9),0_0_12px_rgba(11,6,32,0.7)] md:text-lg md:leading-7">
                {activeStop.summary}
              </p>

              {photos.length > 0 ? (
                <div className="relative mt-4">
                  <div className="relative flex h-[32vh] w-full items-start justify-center overflow-hidden transition-[height] duration-300 ease-out md:h-[45vh]">
                    {photos.map((src, index) => {
                      const active = index === safePhotoIndex;
                      return (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          key={src}
                          src={src}
                          alt={`${activeStop.city} 照片 ${index + 1}`}
                          className={`journey-photo-slide${active ? " is-active" : ""}`}
                          style={
                            active
                              ? {
                                  animation: `journey-kenburns ${PHOTO_HOLD_MS}ms linear forwards`,
                                }
                              : { animation: "none", transform: "scale(1)" }
                          }
                          draggable={false}
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </>
      ) : null}

      <nav
        className="journey-city-list fixed left-5 top-1/2 z-[25] hidden max-h-[min(70vh,36rem)] w-max -translate-y-1/2 md:block"
        aria-label="城市列表"
      >
        <ul className="scrollbar-hide flex max-h-[min(70vh,36rem)] flex-col gap-2 overflow-y-auto py-1">
          {points.map((point) => (
            <li key={point.index}>
              <button
                type="button"
                onClick={() => openCity(point)}
                className="rounded-lg border border-[rgba(139,92,246,0.3)] bg-[rgba(255,255,255,0.08)] px-3 py-1.5 text-left text-[13px] leading-snug text-white opacity-60 shadow-none backdrop-blur-[8px] transition-all duration-200 hover:translate-x-1 hover:bg-[rgba(255,255,255,0.18)] hover:opacity-100"
              >
                {point.city}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      <div className="fixed bottom-16 left-0 right-0 z-30 flex justify-center gap-3 px-4 landscape:bottom-4">
        <Link
          href="/letters"
          className="rounded-full border border-primary/50 bg-space-deep/70 px-4 py-2 text-sm text-primary-light backdrop-blur-sm"
        >
          去月光信局
        </Link>
        <Link
          href={journeyCopy.homeHref}
          className="rounded-full border border-moon-gold/50 bg-space-deep/70 px-4 py-2 text-sm text-moon-gold backdrop-blur-sm"
        >
          返回星空首页
        </Link>
      </div>
    </main>
  );
}
