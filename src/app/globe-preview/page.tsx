"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { GlobeMethods } from "react-globe.gl";

const PreviewGlobe = dynamic(() => import("@/components/GlobeWrapper"), {
  ssr: false,
});

const SIZE = 250;
const COUNTRIES_URL =
  "https://raw.githubusercontent.com/vasturiano/react-globe.gl/master/example/datasets/ne_110m_admin_0_countries.geojson";

type GeoFeature = {
  type: string;
  geometry: {
    type: string;
    coordinates: unknown;
  };
  properties?: Record<string, unknown>;
};

type LatLng = { lat: number; lng: number };
type PathLine = { coords: [number, number][] };

function buildGraticules(): PathLine[] {
  const paths: PathLine[] = [];
  for (let lat = -75; lat <= 75; lat += 15) {
    const coords: [number, number][] = [];
    for (let lng = -180; lng <= 180; lng += 4) coords.push([lat, lng]);
    paths.push({ coords });
  }
  for (let lng = -180; lng < 180; lng += 15) {
    const coords: [number, number][] = [];
    for (let lat = -90; lat <= 90; lat += 4) coords.push([lat, lng]);
    paths.push({ coords });
  }
  return paths;
}

function buildDotField(count = 2200): LatLng[] {
  const points: LatLng[] = [];
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < count; i += 1) {
    const y = 1 - (i / (count - 1)) * 2;
    const radius = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = golden * i;
    const x = Math.cos(theta) * radius;
    const z = Math.sin(theta) * radius;
    points.push({
      lat: (Math.asin(y) * 180) / Math.PI,
      lng: (Math.atan2(z, x) * 180) / Math.PI,
    });
  }
  return points;
}

function GlobeFrame({
  label,
  children,
  frameStyle,
}: {
  label: string;
  children: ReactNode;
  frameStyle?: CSSProperties;
}) {
  return (
    <figure className="flex w-[250px] flex-col items-center gap-3">
      <div
        className="relative overflow-hidden rounded-full"
        style={{
          width: SIZE,
          height: SIZE,
          boxShadow: "0 0 40px rgba(139, 92, 246, 0.22)",
          ...frameStyle,
        }}
      >
        {children}
      </div>
      <figcaption className="text-center text-xs tracking-wide text-[var(--text)]/75">
        {label}
      </figcaption>
    </figure>
  );
}

function useAutoRotate(speed = 0.45) {
  const globeRef = useRef<GlobeMethods | undefined>(undefined);
  function handleReady() {
    const controls = globeRef.current?.controls();
    if (!controls) return;
    controls.autoRotate = true;
    controls.autoRotateSpeed = speed;
    controls.enableZoom = false;
  }
  return { globeRef, handleReady };
}

function GlobeA() {
  const { globeRef, handleReady } = useAutoRotate();
  const paths = useMemo(() => buildGraticules(), []);

  return (
    <GlobeFrame label="A · 线框星球">
      <PreviewGlobe
        globeRef={globeRef}
        width={SIZE}
        height={SIZE}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe={false}
        showAtmosphere
        atmosphereColor="#8B5CF6"
        atmosphereAltitude={0.22}
        pathsData={paths}
        pathPoints="coords"
        pathPointLat={(p: [number, number]) => p[0]}
        pathPointLng={(p: [number, number]) => p[1]}
        pathColor={() => "#8B5CF6"}
        pathStroke={0.6}
        pathAltitude={0.002}
        onGlobeReady={handleReady}
      />
    </GlobeFrame>
  );
}

function GlobeB() {
  const { globeRef, handleReady } = useAutoRotate(0.5);
  const points = useMemo(() => buildDotField(5200), []);

  return (
    <GlobeFrame label="B · 点阵星球">
      <PreviewGlobe
        globeRef={globeRef}
        width={SIZE}
        height={SIZE}
        backgroundColor="rgba(0,0,0,0)"
        showGlobe={false}
        showAtmosphere
        atmosphereColor="#A78BFA"
        atmosphereAltitude={0.25}
        pointsData={points}
        pointLat="lat"
        pointLng="lng"
        pointColor={() => "#EDE9FE"}
        pointAltitude={0.002}
        pointRadius={0.32}
        pointResolution={8}
        onGlobeReady={handleReady}
      />
    </GlobeFrame>
  );
}

function GlobeC({ countries }: { countries: GeoFeature[] }) {
  const { globeRef, handleReady } = useAutoRotate(0.4);

  return (
    <GlobeFrame
      label="C · 发光轮廓地球"
      frameStyle={{ boxShadow: "0 0 42px rgba(251, 191, 36, 0.18), 0 0 36px rgba(139, 92, 246, 0.28)" }}
    >
      <PreviewGlobe
        globeRef={globeRef}
        width={SIZE}
        height={SIZE}
        backgroundColor="rgba(0,0,0,0)"
        showAtmosphere
        atmosphereColor="#C4B5FD"
        atmosphereAltitude={0.2}
        polygonsData={countries}
        polygonCapColor={() => "rgba(46, 16, 101, 0.92)"}
        polygonSideColor={() => "rgba(46, 16, 101, 0.35)"}
        polygonStrokeColor={() => "#FBBF24"}
        polygonAltitude={0.008}
        polygonsTransitionDuration={0}
        onGlobeReady={handleReady}
      />
    </GlobeFrame>
  );
}

function GlobeD() {
  const { globeRef, handleReady } = useAutoRotate(0.4);

  return (
    <GlobeFrame label="D · 单色紫金地球">
      <div
        className="relative h-full w-full"
        style={{
          // 仅用 CSS 滤镜做紫金调，不调用 globeMaterial
          filter:
            "sepia(0.55) hue-rotate(232deg) saturate(2.6) contrast(1.25) brightness(0.95)",
        }}
      >
        <div
          className="pointer-events-none absolute inset-0 z-[1] rounded-full"
          style={{
            background:
              "radial-gradient(circle at 32% 28%, rgba(251,191,36,0.22), transparent 42%), radial-gradient(circle at 70% 72%, rgba(139,92,246,0.35), transparent 55%)",
            mixBlendMode: "soft-light",
          }}
        />
        <PreviewGlobe
          globeRef={globeRef}
          width={SIZE}
          height={SIZE}
          backgroundColor="rgba(0,0,0,0)"
          globeImageUrl="//unpkg.com/three-globe/example/img/earth-blue-marble.jpg"
          showAtmosphere
          atmosphereColor="#8B5CF6"
          atmosphereAltitude={0.18}
          onGlobeReady={handleReady}
        />
      </div>
    </GlobeFrame>
  );
}

export default function GlobePreviewPage() {
  const [countries, setCountries] = useState<GeoFeature[]>([]);

  useEffect(() => {
    let cancelled = false;
    fetch(COUNTRIES_URL)
      .then((res) => res.json())
      .then((geo) => {
        if (cancelled) return;
        setCountries((geo.features ?? []) as GeoFeature[]);
      })
      .catch(() => {
        if (!cancelled) setCountries([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <main
      className="relative z-10 min-h-dvh px-6 py-10"
      style={{
        background:
          "radial-gradient(ellipse 130% 100% at 50% 25%, #1A103D 0%, #0B0620 70%)",
      }}
    >
      <header className="mx-auto mb-10 max-w-3xl text-center">
        <p className="text-xs uppercase tracking-[0.28em] text-primary-light/80">
          Temporary Preview
        </p>
        <h1 className="mt-2 font-display text-2xl text-moon-gold md:text-3xl">
          地球样式预览
        </h1>
        <p className="mt-2 text-sm text-[var(--text)]/70">
          四个静态视觉方案，方便挑选。不影响星图航线主页面。
        </p>
      </header>

      <div className="mx-auto flex max-w-5xl flex-wrap items-start justify-center gap-10 md:gap-12">
        <GlobeA />
        <GlobeB />
        <GlobeC countries={countries} />
        <GlobeD />
      </div>
    </main>
  );
}
