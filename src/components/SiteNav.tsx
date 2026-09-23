"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "framer-motion";
import { navItems } from "@/data/site";

export function SiteNav() {
  const pathname = usePathname();

  if (pathname === "/gate" || pathname === "/globe-preview") return null;

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-cosmos-purple/30 bg-space-deep/90 backdrop-blur-md landscape:bottom-auto landscape:top-0 landscape:border-b landscape:border-t-0"
      aria-label="站点导航"
    >
      <ul className="mx-auto flex max-w-lg items-stretch justify-around px-2 py-2 landscape:max-w-4xl landscape:py-1.5">
        {navItems.map((item) => {
          const active = pathname === item.href;
          return (
            <li key={item.id} className="flex-1">
              <Link
                href={item.href}
                className={`relative flex flex-col items-center gap-0.5 rounded-lg px-1 py-1.5 text-center text-[11px] transition-colors sm:text-xs ${
                  active
                    ? "text-moon-gold"
                    : "text-[var(--muted)] hover:text-cosmos-soft"
                }`}
              >
                {active && (
                  <motion.span
                    layoutId="nav-indicator"
                    className="absolute inset-0 rounded-lg bg-cosmos-purple/20"
                    transition={{ type: "spring", stiffness: 380, damping: 30 }}
                  />
                )}
                <span className="relative">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
