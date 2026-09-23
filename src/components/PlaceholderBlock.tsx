"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

type PlaceholderBlockProps = {
  children?: ReactNode;
  className?: string;
  label?: string;
};

export function PlaceholderBlock({
  children,
  className = "",
  label = "内容占位",
}: PlaceholderBlockProps) {
  return (
    <motion.div
      className={`rounded-2xl border border-dashed border-cosmos-purple/40 bg-space-mist/40 p-4 text-sm text-[var(--muted)] ${className}`}
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-40px" }}
      transition={{ duration: 0.4 }}
    >
      {children ?? label}
    </motion.div>
  );
}
