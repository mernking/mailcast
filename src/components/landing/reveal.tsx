"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

/**
 * Subtle fade + slide-up reveal for landing sections.
 *
 * Uses mount-based animation (`animate`) rather than `whileInView` so the
 * entrance always fires when the component mounts — this guarantees content
 * becomes visible on load regardless of scroll position or IntersectionObserver
 * timing (which can fail to fire in some headless / screenshot contexts and
 * would otherwise leave sections stuck at opacity 0).
 */
export function Reveal({
  children,
  className,
  delay = 0,
  y = 12,
}: {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
}) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  );
}
