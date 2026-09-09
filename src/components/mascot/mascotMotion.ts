import type { MascotPose, MotionBudget, TiltVector } from './mascotTypes';

/**
 * Frame-rate independent exponential smoothing. `tau` is the time the value
 * takes to close ~63% of the remaining distance, so the feel of the movement
 * stays identical at 60Hz and at 120Hz.
 */
export function damp(current: number, target: number, tau: number, dt: number) {
  if (tau <= 0) return target;
  return target + (current - target) * Math.exp(-dt / tau);
}

export const clampUnit = (value: number) => (value < -1 ? -1 : value > 1 ? 1 : value);

export interface EngineRest {
  rotateX: number;
  rotateY: number;
  scale: number;
}

const NEUTRAL: MascotPose = { rotateX: 0, rotateY: 0, translateX: 0, translateY: 0, scale: 1 };

/**
 * Drives one mascot instance.
 *
 * Deliberately framework-free: it owns a single rAF loop, keeps the resolved
 * pose in a plain object, and publishes it as CSS custom properties on the
 * stage element. The still composition reads those properties from CSS and the
 * WebGL scene reads `pose` inside its own render loop, so both layers move
 * from exactly the same numbers and only one loop ever runs per mascot.
 *
 * The loop parks itself once the figure has settled and nothing is asking it to
 * move, and restarts on the next input — an idle tab or an untouched page costs
 * nothing.
 */
export function createMascotEngine(budget: MotionBudget, rest: EngineRest) {
  const pose: MascotPose = { ...NEUTRAL };
  const current: TiltVector = { x: 0, y: 0 };
  const target: TiltVector = { x: 0, y: 0 };

  let element: HTMLElement | null = null;
  let frame = 0;
  let last = 0;
  let clock = 0;
  let running = false;
  let awake = true;
  const written = new Map<string, string>();

  const write = (name: string, value: string) => {
    if (!element || written.get(name) === value) return;
    written.set(name, value);
    element.style.setProperty(name, value);
  };

  const publish = () => {
    write('--mascot-rx', `${pose.rotateX.toFixed(3)}deg`);
    write('--mascot-ry', `${pose.rotateY.toFixed(3)}deg`);
    write('--mascot-tx', `${pose.translateX.toFixed(2)}px`);
    write('--mascot-ty', `${pose.translateY.toFixed(2)}px`);
    write('--mascot-scale', pose.scale.toFixed(4));
  };

  const resolve = () => {
    // Idle breathing keeps the figure alive when nobody is pointing at it. It is
    // measured in degrees and stays well under a single degree.
    const driftY = budget.drift === 0 ? 0 : Math.sin(clock * 0.31) * budget.drift;
    const driftX = budget.drift === 0 ? 0 : Math.sin(clock * 0.23 + 1.1) * budget.drift * 0.55;
    const deflection = (Math.abs(current.x) + Math.abs(current.y)) * 0.5;

    pose.rotateY = rest.rotateY + current.x * budget.rotateY + driftY;
    pose.rotateX = rest.rotateX - current.y * budget.rotateX + driftX;
    pose.translateX = current.x * budget.parallax;
    pose.translateY = current.y * budget.parallax * 0.45;
    pose.scale = rest.scale + deflection * budget.scale;
    publish();
  };

  const settled = () =>
    budget.drift === 0 &&
    Math.abs(current.x - target.x) < 4e-4 &&
    Math.abs(current.y - target.y) < 4e-4;

  const tick = (now: number) => {
    // Cap dt so a backgrounded tab does not resume with one enormous jump.
    const dt = Math.min((now - last) / 1000, 0.05);
    last = now;
    clock += dt;

    current.x = damp(current.x, target.x, budget.tau, dt);
    current.y = damp(current.y, target.y, budget.tau, dt);
    resolve();

    if (settled()) {
      current.x = target.x;
      current.y = target.y;
      resolve();
      running = false;
      frame = 0;
      return;
    }
    frame = requestAnimationFrame(tick);
  };

  const wake = () => {
    if (running || !awake) return;
    running = true;
    last = performance.now();
    frame = requestAnimationFrame(tick);
  };

  return {
    pose,

    /** Point the mascot at a normalised position; both axes are clamped. */
    setTarget(x: number, y: number) {
      target.x = clampUnit(x);
      target.y = clampUnit(y);
      wake();
    },

    /** Let the figure ease back to its natural pose. */
    release() {
      target.x = 0;
      target.y = 0;
      wake();
    },

    /**
     * Displace the figure and let the damping carry it home. Used for the
     * entrance and for the celebratory states, which is as much "animation" as
     * a still model can honestly offer.
     */
    impulse(x: number, y: number) {
      current.x = clampUnit(x);
      current.y = clampUnit(y);
      wake();
    },

    updateBudget(next: MotionBudget) {
      Object.assign(budget, next);
      wake();
    },

    updateRest(next: EngineRest) {
      Object.assign(rest, next);
      wake();
    },

    /** Attach the element that carries the CSS custom properties. */
    attach(next: HTMLElement | null) {
      element = next;
      written.clear();
      if (element) resolve();
    },

    /** Stop burning frames — used for hidden tabs and off-screen mascots. */
    suspend() {
      awake = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
    },

    resume() {
      awake = true;
      wake();
    },

    destroy() {
      awake = false;
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
      running = false;
      element = null;
    },
  };
}

export type MascotEngine = ReturnType<typeof createMascotEngine>;
