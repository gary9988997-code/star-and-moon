"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { GlobeMethods } from "react-globe.gl";
import { journeyCopy, journeyData, journeyStops } from "@/data/journey";

const JourneyGlobe = dynamic(() => import("@/components/GlobeWrapper"), {
  ssr: false,
});

const FLY_MS = 1500;
const REST_POV = { lat: 20, lng: 0, altitude: 2.5 };
const PAST_COUNT = 11;

type GlobePoint = {
  lat: number;
  lng: number;
  index: number;
  isPast: boolean;
  city: string;
  title: string;
  photo: string;
};

export default function JourneyPage() {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  const stageRef = useRef<HTMLDivElement>(null);
  const tipsRef = useRef<HTMLElement[]>([]);
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

  const openCity = useCallback((point: GlobePoint) => {
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
      const color = point.isPast ? "#FBBF24" : "#A78BFA";
      const soft = point.isPast
        ? "rgba(251, 191, 36, 0.55)"
        : "rgba(167, 139, 250, 0.55)";
      const tipBorder = point.isPast
        ? "1px solid rgba(251, 191, 36, 0.45)"
        : "1px solid rgba(167, 139, 250, 0.45)";
      const tipGlow = point.isPast
        ? "0 0 14px rgba(251, 191, 36, 0.28), 0 8px 20px rgba(0, 0, 0, 0.35)"
        : "0 0 14px rgba(139, 92, 246, 0.32), 0 8px 20px rgba(0, 0, 0, 0.35)";
      const delay = `${(point.index % 5) * 0.28}s`;

      const anchor = document.createElement("div");
      anchor.style.pointerEvents = "auto";
      anchor.style.zIndex = "1";

      const hit = document.createElement("button");
      hit.type = "button";
      const setHit = (property: string, value: string) => {
        hit.style.setProperty(property, value, "important");
      };
      setHit("position", "absolute");
      setHit("left", "0");
      setHit("top", "0");
      setHit("transform", "translate(-50%, -50%)");
      setHit("width", "22px");
      setHit("height", "22px");
      setHit("padding", "0");
      setHit("margin", "0");
      setHit("overflow", "visible");
      setHit("border", "none");
      setHit("background", "transparent");
      setHit("appearance", "none");
      setHit("-webkit-appearance", "none");
      setHit("cursor", "pointer");
      setHit("pointer-events", "auto");

      const star = document.createElement("span");
      const starRest = "translate(-50%, -50%) scale(1)";
      const starHover = "translate(-50%, -50%) scale(1.2)";
      star.style.setProperty("position", "absolute", "important");
      star.style.setProperty("left", "50%", "important");
      star.style.setProperty("top", "50%", "important");
      star.style.setProperty("width", "6px", "important");
      star.style.setProperty("height", "6px", "important");
      star.style.setProperty("transform", starRest, "important");
      star.style.setProperty("transform-origin", "center center", "important");
      star.style.setProperty("transition", "transform 0.2s ease", "important");
      star.style.setProperty("pointer-events", "none", "important");

      const halo = document.createElement("span");
      halo.style.setProperty("position", "absolute", "important");
      halo.style.setProperty("left", "50%", "important");
      halo.style.setProperty("top", "50%", "important");
      halo.style.setProperty("width", "14px", "important");
      halo.style.setProperty("height", "14px", "important");
      halo.style.setProperty("transform", "translate(-50%, -50%)", "important");
      halo.style.setProperty("border-radius", "50%", "important");
      halo.style.setProperty("background", soft, "important");
      halo.style.setProperty("filter", "blur(3px)", "important");
      halo.style.setProperty("opacity", "0.55", "important");
      halo.style.setProperty(
        "animation",
        `star-breathe 2s ease-in-out ${delay} infinite`,
        "important",
      );
      halo.style.setProperty("pointer-events", "none", "important");

      const ring = document.createElement("span");
      ring.style.setProperty("position", "absolute", "important");
      ring.style.setProperty("left", "50%", "important");
      ring.style.setProperty("top", "50%", "important");
      ring.style.setProperty("width", "6px", "important");
      ring.style.setProperty("height", "6px", "important");
      ring.style.setProperty("border-radius", "50%", "important");
      ring.style.setProperty("background", "transparent", "important");
      ring.style.setProperty("border", `1px solid ${color}`, "important");
      ring.style.setProperty("box-shadow", `0 0 10px ${soft}`, "important");
      ring.style.setProperty(
        "animation",
        `star-ring 2s ease-out ${delay} infinite`,
        "important",
      );
      ring.style.setProperty("pointer-events", "none", "important");

      const core = document.createElement("span");
      core.style.setProperty("position", "relative", "important");
      core.style.setProperty("z-index", "1", "important");
      core.style.setProperty("display", "block", "important");
      core.style.setProperty("width", "6px", "important");
      core.style.setProperty("height", "6px", "important");
      core.style.setProperty("border-radius", "50%", "important");
      core.style.setProperty("background", color, "important");
      core.style.setProperty(
        "box-shadow",
        `0 0 6px ${color}, 0 0 12px ${soft}`,
        "important",
      );
      core.style.setProperty(
        "animation",
        `star-core 2s ease-in-out ${delay} infinite`,
        "important",
      );
      core.style.setProperty("pointer-events", "none", "important");

      const tip = document.createElement("span");
      const hideTip = () => {
        tip.style.setProperty("opacity", "0", "important");
        tip.style.setProperty("pointer-events", "none", "important");
      };
      const showTip = () => {
        tip.style.setProperty("opacity", "1", "important");
        tip.style.setProperty("pointer-events", "auto", "important");
      };
      tip.style.setProperty("position", "absolute", "important");
      tip.style.setProperty("left", "calc(100% + 10px)", "important");
      tip.style.setProperty("top", "50%", "important");
      tip.style.setProperty("transform", "translateY(-50%)", "important");
      tip.style.setProperty("z-index", "2", "important");
      tip.style.setProperty("display", "block", "important");
      tip.style.setProperty("min-width", "0", "important");
      tip.style.setProperty("max-width", "148px", "important");
      tip.style.setProperty("padding", "6px 9px", "important");
      tip.style.setProperty("border-radius", "10px", "important");
      tip.style.setProperty("background", "rgba(11, 6, 32, 0.78)", "important");
      tip.style.setProperty("backdrop-filter", "blur(10px)", "important");
      tip.style.setProperty("-webkit-backdrop-filter", "blur(10px)", "important");
      tip.style.setProperty("border", tipBorder, "important");
      tip.style.setProperty("box-shadow", tipGlow, "important");
      tip.style.setProperty("text-align", "left", "important");
      tip.style.setProperty("transition", "opacity 0.2s ease", "important");
      hideTip();

      const city = document.createElement("span");
      city.textContent = point.city;
      city.style.setProperty("display", "block", "important");
      city.style.setProperty("color", "#F8F5FF", "important");
      city.style.setProperty("font-size", "12px", "important");
      city.style.setProperty("font-weight", "700", "important");
      city.style.setProperty("line-height", "1.3", "important");
      city.style.setProperty("white-space", "nowrap", "important");

      const title = document.createElement("span");
      title.textContent = point.title;
      title.style.setProperty("display", "block", "important");
      title.style.setProperty("margin-top", "2px", "important");
      title.style.setProperty("color", "rgba(248, 245, 255, 0.72)", "important");
      title.style.setProperty("font-size", "11px", "important");
      title.style.setProperty("font-weight", "400", "important");
      title.style.setProperty("line-height", "1.35", "important");
      title.style.setProperty("white-space", "normal", "important");

      tip.appendChild(city);
      tip.appendChild(title);
      tipsRef.current[point.index] = tip;

      star.appendChild(halo);
      star.appendChild(ring);
      star.appendChild(core);
      hit.appendChild(star);
      hit.appendChild(tip);

      hit.addEventListener("mouseenter", () => {
        anchor.style.zIndex = "50";
        tipsRef.current.forEach((other) => {
          if (!other || other === tip) return;
          other.style.setProperty("opacity", "0", "important");
          other.style.setProperty("pointer-events", "none", "important");
        });
        star.style.setProperty("transform", starHover, "important");
        showTip();
      });
      hit.addEventListener("mouseleave", () => {
        anchor.style.zIndex = "1";
        star.style.setProperty("transform", starRest, "important");
        hideTip();
      });

      const stopGlobeGesture = (event: Event) => {
        event.stopPropagation();
      };
      hit.addEventListener("pointerdown", stopGlobeGesture);
      hit.addEventListener("pointerup", stopGlobeGesture);
      hit.addEventListener("mousedown", stopGlobeGesture);
      hit.addEventListener("touchstart", stopGlobeGesture, { passive: true });
      hit.addEventListener("click", (event) => {
        event.stopPropagation();
        event.preventDefault();
        openCity(point);
      });

      anchor.appendChild(hit);
      return anchor;
    },
    [openCity, "star-pulse-v2"],
  );

  function handleCloseCard() {
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
      `}</style>
      {/* 竖屏：上半屏地球。桌面：fixed 铺满，卡片开关不改变这块尺寸 */}
      <div
        ref={stageRef}
        className="earth-stage relative z-0 h-[46vh] w-full min-h-[320px] overflow-hidden md:fixed md:inset-0 md:z-0 md:h-auto md:min-h-0 md:w-auto"
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
          <JourneyGlobe
            globeRef={globeRef}
            autoRotate={true}
            autoRotateSpeed={0.5}
            width={globeSize.width}
            height={globeSize.height}
            backgroundColor="rgba(0,0,0,0)"
            globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
            atmosphereColor="#8B5CF6"
            atmosphereAltitude={0.15}
            htmlElementsData={points}
            htmlLat="lat"
            htmlLng="lng"
            htmlAltitude={0.01}
            htmlElement={htmlElement}
            onGlobeReady={handleGlobeReady}
          />
        </div>
        <p className="pointer-events-none absolute bottom-24 left-0 right-0 z-[3] text-center text-sm text-[var(--text)]/80 [text-shadow:0_1px_8px_rgba(11,6,32,0.9)] md:bottom-28">
          轻点城市，飞向这里
        </p>
      </div>

      {activeStop ? (
        <div className="relative z-10 mt-4 w-full md:fixed md:right-4 md:top-1/2 md:z-20 md:mt-0 md:w-[min(28rem,40vw)] md:-translate-y-1/2">
          <div
            className="scrollbar-hide max-h-none w-full overflow-y-auto border-none bg-transparent p-2 text-left sm:p-4 md:max-h-[calc(100dvh-6rem)]"
            role="dialog"
            aria-label={activeStop.city}
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
          </div>
        ) : null}

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
