"use client";

import { motion } from "framer-motion";

type MoonGlowProps = {
  className?: string;
  size?: "sm" | "md" | "lg";
};

const sizeMap = {
  sm: "h-24 w-24",
  md: "h-40 w-40 sm:h-48 sm:w-48",
  lg: "h-52 w-52 sm:h-64 sm:w-64 landscape:h-40 landscape:w-40",
};

export function MoonGlow({ className = "", size = "md" }: MoonGlowProps) {
  return (
    <div className={`relative flex items-center justify-center ${className}`}>
      <motion.div
        className={`absolute rounded-full bg-moon-glow/30 blur-3xl ${sizeMap[size]}`}
        animate={{ scale: [1, 1.08, 1], opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className={`relative rounded-full bg-gradient-to-br from-moon-pale via-moon-gold to-moon-glow shadow-[0_0_40px_rgba(232,200,122,0.35)] ${sizeMap[size]}`}
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}
