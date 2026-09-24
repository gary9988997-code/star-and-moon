"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const linkClass =
  "relative flex items-center justify-center rounded-md px-2 py-1.5 text-[var(--muted)] transition-colors hover:text-moon-gold";

const activeClass = "text-moon-gold";

const iconProps = {
  width: 18,
  height: 18,
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.6,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
  "aria-hidden": true as const,
};

function HomeIcon() {
  return (
    <svg {...iconProps}>
      <path d="M4 11.5 12 4l8 7.5" />
      <path d="M7 10.5V20h10v-9.5" />
    </svg>
  );
}

/** 罗盘：外圆 + 四角星 + 轨道弧 */
function CompassIcon() {
  return (
    <svg {...iconProps}>
      <circle cx="12" cy="12" r="8.25" />
      <path d="M12 5.5 13.35 10.65 18.5 12 13.35 13.35 12 18.5 10.65 13.35 5.5 12 10.65 10.65Z" />
      <path d="M16.8 6.2a7.2 7.2 0 0 1 1.4 8.6" />
    </svg>
  );
}

/** 弯月：开口朝右上 + 内侧小四角星 */
function CrescentMoonIcon() {
  return (
    <svg {...iconProps}>
      <path d="M15.2 4.6a8.2 8.2 0 1 0 3.9 14.2 6.6 6.6 0 1 1-3.9-14.2z" />
      <path d="M15.2 9.2 15.75 10.75 17.3 11.3 15.75 11.85 15.2 13.4 14.65 11.85 13.1 11.3 14.65 10.75Z" />
    </svg>
  );
}

function LetterIcon() {
  return (
    <svg {...iconProps}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 7 9-7" />
    </svg>
  );
}

export function SiteNav() {
  const pathname = usePathname();

  if (pathname === "/gate") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 landscape:bottom-auto landscape:top-0"
      aria-label="站点导航"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2 landscape:max-w-4xl landscape:py-1.5">
        <li className="flex-1">
          <Link
            href="/home"
            className={`${linkClass} ${pathname === "/" || pathname === "/home" ? activeClass : ""}`}
            aria-label="星空首页"
            title="星空首页"
          >
            <HomeIcon />
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/journey"
            className={`${linkClass} ${pathname === "/journey" ? activeClass : ""}`}
            aria-label="星图航线"
            title="星图航线"
          >
            <CompassIcon />
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/letters"
            className={`${linkClass} ${pathname === "/letters" ? activeClass : ""}`}
            aria-label="月光信局"
            title="月光信局"
          >
            <CrescentMoonIcon />
          </Link>
        </li>
        <li className="flex-1">
          <Link
            href="/letter"
            className={`${linkClass} ${pathname === "/letter" ? activeClass : ""}`}
            aria-label="月下定信"
            title="月下定信"
          >
            <LetterIcon />
          </Link>
        </li>
      </ul>
    </nav>
  );
}
