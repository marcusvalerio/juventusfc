import type { MascotState, MascotVariant, MotionBudget } from './mascotTypes';

/**
 * Where the 3D model is expected. The file does not have to exist: `Mascot3D`
 * probes for it and falls back to the still composition when it is missing, so
 * dropping the GLB in `public/models/` is the only step needed to switch over.
 */
export const MASCOT_MODEL_URL =
  import.meta.env.VITE_MASCOT_MODEL_URL ?? '/models/juventus-mascot.glb';

/** Still artwork used while there is no model, and as the WebGL-less fallback. */
export const MASCOT_ARTWORK = {
  webp: '/mascot/juventus-mascot.webp',
  webpSmall: '/mascot/juventus-mascot-sm.webp',
  png: '/mascot/juventus-mascot.png',
  width: 900,
  height: 1350,
} as const;

/**
 * Motion budgets. The brief asks for a figure that acknowledges the visitor,
 * not one that follows the cursor: the turn stays between 3° and 6° and the
 * damping is slow enough that quick mouse flicks never read as jitter.
 */
const BUDGETS: Record<MascotVariant, MotionBudget> = {
  home: { rotateX: 3.6, rotateY: 5.6, parallax: 16, scale: 0.02, tau: 0.42, drift: 0.5 },
  login: { rotateX: 2.4, rotateY: 3.6, parallax: 9, scale: 0.012, tau: 0.55, drift: 0.32 },
  compact: { rotateX: 2.2, rotateY: 3.2, parallax: 6, scale: 0.01, tau: 0.5, drift: 0.28 },
};

/**
 * States lean the resting pose rather than animating it. `success` and
 * `victory` also get a one-off impulse when they become active (see
 * `mascotMotion`), which is as far as state animation goes without a rigged
 * model to drive.
 */
const STATE_POSE: Record<MascotState, { rotateY: number; rotateX: number; scale: number; energy: number }> = {
  idle: { rotateY: 0, rotateX: 0, scale: 1, energy: 1 },
  focus: { rotateY: 0, rotateX: -0.6, scale: 1.015, energy: 1.15 },
  login: { rotateY: -1.4, rotateX: 0, scale: 0.995, energy: 0.85 },
  success: { rotateY: 0, rotateX: -1.2, scale: 1.02, energy: 1.2 },
  victory: { rotateY: 1.8, rotateX: -1.8, scale: 1.03, energy: 1.3 },
};

/** Entrance timing, in seconds. Short — the mascot arrives after the copy. */
export const ENTRANCE: Record<MascotVariant, { delay: number; duration: number }> = {
  home: { delay: 0.5, duration: 0.9 },
  login: { delay: 0.35, duration: 0.8 },
  compact: { delay: 0.2, duration: 0.6 },
};

export function budgetFor(variant: MascotVariant, intensity: number, state: MascotState): MotionBudget {
  const base = BUDGETS[variant];
  const k = Math.max(0, Math.min(1, intensity)) * STATE_POSE[state].energy;
  return {
    rotateX: base.rotateX * k,
    rotateY: base.rotateY * k,
    parallax: base.parallax * k,
    scale: base.scale * k,
    tau: base.tau,
    drift: base.drift * k,
  };
}

export function restPoseFor(state: MascotState) {
  return STATE_POSE[state];
}
