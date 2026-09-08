import type { Transition, Variants } from 'framer-motion';

/**
 * One motion vocabulary for the whole product.
 * Durations stay short enough to never sit between the user and the data:
 * movement communicates hierarchy, it does not perform.
 */
export const EASE = [0.22, 1, 0.36, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR = {
  fast: 0.14,
  base: 0.22,
  slow: 0.36,
  editorial: 0.7,
} as const;

export const springSoft: Transition = { type: 'spring', stiffness: 320, damping: 34, mass: 0.7 };
export const springSnappy: Transition = { type: 'spring', stiffness: 520, damping: 38, mass: 0.6 };

/** Page-level transition: a short lift, never a slide that reflows the layout. */
export const pageVariants: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
  exit: { opacity: 0, y: -6, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
};

/** Container that reveals its children in sequence. */
export const staggerContainer = (stagger = 0.045, delay = 0): Variants => ({
  initial: {},
  animate: { transition: { staggerChildren: stagger, delayChildren: delay } },
});

export const riseItem: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.slow, ease: EASE } },
};

export const fadeItem: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.slow, ease: EASE } },
};

/** Table rows: a whisper of movement, otherwise long lists feel seasick. */
export const rowItem: Variants = {
  initial: { opacity: 0, y: 4 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DUR.fast } },
};

export const overlayVariants: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.base, ease: EASE } },
  exit: { opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
};

export const modalVariants: Variants = {
  initial: { opacity: 0, y: 16, scale: 0.98 },
  animate: { opacity: 1, y: 0, scale: 1, transition: springSoft },
  exit: { opacity: 0, y: 8, scale: 0.99, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
};

export const drawerVariants: Variants = {
  initial: { x: '100%' },
  animate: { x: 0, transition: { type: 'spring', stiffness: 420, damping: 42 } },
  exit: { x: '100%', transition: { duration: DUR.base, ease: EASE_IN_OUT } },
};

export const dropdownVariants: Variants = {
  initial: { opacity: 0, y: -4, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1, transition: { duration: DUR.fast, ease: EASE } },
  exit: { opacity: 0, y: -2, scale: 0.98, transition: { duration: 0.1, ease: EASE_IN_OUT } },
};

export const collapseVariants: Variants = {
  initial: { height: 0, opacity: 0 },
  animate: { height: 'auto', opacity: 1, transition: { duration: DUR.base, ease: EASE } },
  exit: { height: 0, opacity: 0, transition: { duration: DUR.fast, ease: EASE_IN_OUT } },
};

/** Shared press feedback so every actionable surface answers the same way. */
export const pressable = {
  whileHover: { y: -1 },
  whileTap: { scale: 0.985, y: 0 },
  transition: springSnappy,
} as const;
