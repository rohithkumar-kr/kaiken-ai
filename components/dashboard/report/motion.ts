import type { Variants } from "framer-motion";

export type Ease = [number, number, number, number];

export const EASE: Ease = [0.22, 1, 0.36, 1];

export const staggerContainer: Variants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.05, delayChildren: 0.05 },
  },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.45, ease: EASE },
  },
};
