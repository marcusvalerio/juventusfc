/**
 * Public vocabulary of the mascot layer.
 *
 * The mascot is decorative: nothing in the product depends on it rendering, so
 * every type here describes presentation, never data or behaviour of a screen.
 */

/** Where the mascot is standing. Each variant carries its own motion budget. */
export type MascotVariant = 'home' | 'login' | 'compact';

/**
 * What the mascot is doing. Only `idle` and `login` are visually distinct today;
 * the rest are declared so screens can already ask for them and so a future GLB
 * with named animation clips has somewhere to plug in.
 */
export type MascotState = 'idle' | 'focus' | 'login' | 'success' | 'victory';

/** Normalised input, both axes in [-1, 1]. Origin is the neutral pose. */
export interface TiltVector {
  x: number;
  y: number;
}

/** How far the mascot is allowed to move, in degrees / pixels / ratio. */
export interface MotionBudget {
  /** Vertical nod, in degrees. Kept inside the 3°–6° band. */
  rotateX: number;
  /** Horizontal turn, in degrees. */
  rotateY: number;
  /** Lateral drift of the whole figure, in pixels. */
  parallax: number;
  /** Extra scale at full deflection — a hint of approach, nothing more. */
  scale: number;
  /** Time constant of the damping, in seconds. Larger is heavier. */
  tau: number;
  /** Amplitude of the idle breathing, in degrees. Zero disables it. */
  drift: number;
}

/** Resolved pose for one frame, consumed by both the CSS and the WebGL layer. */
export interface MascotPose {
  rotateX: number;
  rotateY: number;
  translateX: number;
  translateY: number;
  scale: number;
}

export interface Mascot3DProps {
  variant?: MascotVariant;
  state?: MascotState;
  /** Multiplier over the variant's motion budget, 0 (still) to 1 (full). */
  intensity?: number;
  className?: string;
  /** Load the artwork eagerly. True for a hero, false for anything below it. */
  priority?: boolean;
}
