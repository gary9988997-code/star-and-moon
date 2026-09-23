"use client";

import Link from "next/link";
import { homeConfig } from "@/data/config";

export default function HomePage() {
  return (
    <main className="relative z-10 flex min-h-dvh flex-col items-center justify-center safe-px safe-py pb-24">
      <div className="w-full max-w-md text-center">
        <h1 className="font-display text-2xl leading-snug text-moon-gold sm:text-3xl">
          {homeConfig.title}
        </h1>

        <div className="mt-6 space-y-2 text-sm leading-relaxed text-[var(--text)]/85 sm:text-base">
          {homeConfig.subtitleLines.map((line) => (
            <p key={line}>{line}</p>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:justify-center">
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
    </main>
  );
}
