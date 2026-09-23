"use client";

import dynamic from "next/dynamic";
import type { LetterGalaxy3DProps } from "./LetterGalaxy3D";

const LetterGalaxy3D = dynamic(() => import("./LetterGalaxy3D"), {
  ssr: false,
  loading: () => (
    <div className="letter-galaxy-fallback" aria-hidden>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/images/letter-galaxy-fallback.svg"
        alt=""
        className="letter-galaxy-fallback-img"
        draggable={false}
      />
    </div>
  ),
});

/** 月光信局三维星系入口：强制客户端加载，避免 SSR / WebGL 问题 */
export default function LetterGalaxy(props: LetterGalaxy3DProps) {
  return <LetterGalaxy3D {...props} />;
}
