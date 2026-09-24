"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { homeConfig } from "@/data/config";
import ParticleStoryErrorBoundary from "@/components/home/ParticleStoryErrorBoundary";

/** 粒子叙事开关：false 时显示静态兜底（玫瑰 + 两个入口链接） */
const ENABLE_PARTICLE_STORY = true;

const ParticleStory = dynamic(
  () => import("@/components/home/ParticleStory"),
  { ssr: false },
);

function HomeStaticFallback() {
  return (
    <div className="relative z-10 flex min-h-dvh flex-col items-center justify-center safe-px safe-py pb-24">
      <div className="flex w-full max-w-md flex-col items-center text-center">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/images/rose-cutout.png"
          alt=""
          className="mb-8 h-auto w-[min(56vw,220px)] select-none object-contain opacity-90"
          draggable={false}
        />
        <div className="flex w-full flex-col gap-3 sm:flex-row sm:justify-center">
          {homeConfig.entries.map((entry) => (
            <Link
              key={entry.id}
              href={entry.href}
              className="rounded-lg border border-moon-gold/50 bg-moon-gold/10 px-6 py-3 text-sm text-moon-gold transition hover:bg-moon-gold/20"
            >
              {entry.label}
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function HomePage() {
  if (!ENABLE_PARTICLE_STORY) {
    return (
      <main className="relative min-h-dvh overflow-hidden">
        <HomeStaticFallback />
      </main>
    );
  }

  return (
    <main className="relative min-h-dvh overflow-hidden">
      {/* 图层：StarField(layout) → 粒子画布 → SiteNav(layout) */}
      <ParticleStoryErrorBoundary fallback={<HomeStaticFallback />}>
        <ParticleStory />
      </ParticleStoryErrorBoundary>
    </main>
  );
}
