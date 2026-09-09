import { useEffect, useMemo, useRef } from 'react';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { budgetFor, restPoseFor } from './mascotConfig';
import { createMascotEngine, type MascotEngine } from './mascotMotion';
import { useDeviceTilt } from './useMascotSensors';
import type { MascotState, MascotVariant } from './mascotTypes';

/** How long the figure waits, after the pointer stops, before easing home. */
const POINTER_IDLE_MS = 2200;

interface Options {
  variant: MascotVariant;
  state: MascotState;
  intensity: number;
  /** When true the engine never runs and the mascot holds its resting pose. */
  reducedMotion: boolean;
}

/**
 * Wires one mascot to the inputs available on this device: the mouse on a fine
 * pointer, device orientation on a coarse one, nothing at all under reduced
 * motion. Everything downstream reads the same engine, so the still layer and
 * the WebGL layer can never disagree about where the figure is looking.
 */
export function useMascotMotion({ variant, state, intensity, reducedMotion }: Options) {
  const budget = useMemo(() => budgetFor(variant, intensity, state), [variant, intensity, state]);
  const rest = useMemo(() => restPoseFor(state), [state]);

  const engineRef = useRef<MascotEngine>();
  if (!engineRef.current) {
    engineRef.current = createMascotEngine(
      { ...budget, drift: 0 },
      { rotateX: rest.rotateX, rotateY: rest.rotateY, scale: rest.scale },
    );
  }
  const engine = engineRef.current;
  const stageRef = useRef<HTMLDivElement>(null);

  const finePointer = useMediaQuery('(pointer: fine)');
  const coarsePointer = useMediaQuery('(pointer: coarse)');

  useEffect(() => () => engine.destroy(), [engine]);

  // Keep tuning in sync, and let reduced motion cancel the idle breathing
  // outright rather than merely slowing it down.
  useEffect(() => {
    engine.updateBudget(reducedMotion ? { ...budget, drift: 0 } : budget);
    engine.updateRest({ rotateX: rest.rotateX, rotateY: rest.rotateY, scale: rest.scale });
  }, [engine, budget, rest, reducedMotion]);

  useEffect(() => {
    engine.attach(stageRef.current);
    if (reducedMotion) {
      engine.suspend();
      return;
    }
    engine.resume();
    // Arrival: the figure enters slightly turned away and settles into place.
    engine.impulse(-0.55, -0.28);
  }, [engine, reducedMotion]);

  // The celebratory states have no clips to play yet, so they read as a nudge.
  useEffect(() => {
    if (reducedMotion) return;
    if (state === 'success') engine.impulse(0.25, -0.4);
    if (state === 'victory') engine.impulse(-0.4, -0.55);
  }, [engine, state, reducedMotion]);

  useEffect(() => {
    if (reducedMotion || !finePointer) return;

    let idle = 0;
    const move = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return;
      engine.setTarget(
        (event.clientX / window.innerWidth) * 2 - 1,
        (event.clientY / window.innerHeight) * 2 - 1,
      );
      window.clearTimeout(idle);
      idle = window.setTimeout(() => engine.release(), POINTER_IDLE_MS);
    };
    const leave = () => {
      window.clearTimeout(idle);
      engine.release();
    };

    window.addEventListener('pointermove', move, { passive: true });
    document.addEventListener('mouseleave', leave);
    window.addEventListener('blur', leave);
    return () => {
      window.clearTimeout(idle);
      window.removeEventListener('pointermove', move);
      document.removeEventListener('mouseleave', leave);
      window.removeEventListener('blur', leave);
    };
  }, [engine, finePointer, reducedMotion]);

  const sensors = useDeviceTilt(coarsePointer && !reducedMotion, (x, y) => {
    engine.setTarget(x, y);
  });

  // A mascot nobody can see must not hold a frame loop open.
  useEffect(() => {
    if (reducedMotion) return;
    const visibility = () => (document.hidden ? engine.suspend() : engine.resume());
    document.addEventListener('visibilitychange', visibility);

    const stage = stageRef.current;
    let observer: IntersectionObserver | undefined;
    if (stage && typeof IntersectionObserver !== 'undefined') {
      observer = new IntersectionObserver(
        ([entry]) => {
          if (document.hidden) return;
          if (entry.isIntersecting) engine.resume();
          else engine.suspend();
        },
        { threshold: 0 },
      );
      observer.observe(stage);
    }

    return () => {
      document.removeEventListener('visibilitychange', visibility);
      observer?.disconnect();
    };
  }, [engine, reducedMotion]);

  return { stageRef, engine, sensors };
}
