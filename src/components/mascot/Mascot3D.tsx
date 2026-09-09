import { Suspense, lazy, useCallback, useEffect, useState } from 'react';
import { Move3d } from 'lucide-react';
import { cn } from '@/lib/cn';
import { useMediaQuery } from '@/hooks/useMediaQuery';
import { MascotBoundary } from './MascotBoundary';
import { MascotStage } from './MascotStage';
import { MascotStill } from './MascotStill';
import {
  hasWebGL,
  isLowPowerDevice,
  prefersDataSaving,
  probeMascotModel,
  type MascotRenderMode,
} from './mascotCapabilities';
import { useMascotMotion } from './useMascotMotion';
import type { Mascot3DProps } from './mascotTypes';

const MascotScene = lazy(() => import('./MascotScene'));

/**
 * The club's mascot, as one component for every screen that shows it.
 *
 * It renders the still composition first and upgrades itself to the real model
 * the moment `public/models/juventus-mascot.glb` is present — there is no flag
 * to flip and no second implementation to keep in step. Both layers are driven
 * by the same motion engine, so the figure answers the mouse on a desktop and
 * the phone's tilt on a handset with the same restraint either way.
 *
 * It is decorative by construction: `aria-hidden`, never focusable, never
 * hit-testable, and every failure path ends at the still image rather than at
 * an empty frame.
 */
export function Mascot3D({
  variant = 'home',
  state = 'idle',
  intensity = 1,
  className,
  priority = false,
}: Mascot3DProps) {
  const reducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const { stageRef, engine, sensors } = useMascotMotion({ variant, state, intensity, reducedMotion });
  const [mode, setMode] = useState<MascotRenderMode>('still');
  const [lowPower] = useState(isLowPowerDevice);

  // Nothing about the 3D stack is fetched until the model is known to exist and
  // the device is a plausible host for it. A page that never gets past this
  // effect costs exactly one HEAD request.
  useEffect(() => {
    if (reducedMotion || prefersDataSaving() || !hasWebGL()) {
      setMode('still');
      return;
    }
    let active = true;
    void probeMascotModel().then((available) => {
      if (active && available) setMode('model');
    });
    return () => {
      active = false;
    };
  }, [reducedMotion]);

  const still = <MascotStill priority={priority} />;
  const downgrade = useCallback(() => setMode('still'), []);

  return (
    <div
      data-mascot={variant}
      data-mascot-mode={mode}
      className={cn('pointer-events-none relative h-full w-full', className)}
    >
      <MascotStage
        variant={variant}
        reducedMotion={reducedMotion}
        stageRef={stageRef}
        className="h-full w-full"
      >
        {mode === 'model' ? (
          <MascotBoundary fallback={still} onError={downgrade}>
            <Suspense fallback={still}>
              <MascotScene engine={engine} lowPower={lowPower} />
            </Suspense>
          </MascotBoundary>
        ) : (
          still
        )}
      </MascotStage>

      {/*
        iOS hands over the motion sensor only after a gesture, so it is offered
        rather than demanded. Declining costs nothing: the mascot simply holds
        its pose, and the control does not come back this session.
      */}
      {sensors.status === 'needs-permission' && (
        <button
          type="button"
          onClick={() => void sensors.request()}
          className="pointer-events-auto absolute bottom-2 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-line-strong bg-surface-sunken/85 px-3.5 py-1.5 text-2xs uppercase tracking-label text-ink-faint backdrop-blur-[2px] transition-colors duration-200 hover:border-line-gold hover:text-gold-light"
        >
          <Move3d className="h-3.5 w-3.5" aria-hidden />
          Ativar movimento
        </button>
      )}
    </div>
  );
}
