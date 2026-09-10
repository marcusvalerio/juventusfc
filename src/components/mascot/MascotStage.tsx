import type { CSSProperties, ReactNode } from 'react';
import { motion } from 'framer-motion';
import { EASE } from '@/lib/motion';
import { cn } from '@/lib/cn';
import { ENTRANCE } from './mascotConfig';
import type { MascotVariant } from './mascotTypes';

/**
 * Parallax for one layer.
 *
 * Every layer reads the same custom properties the motion engine publishes on
 * the stage and scales them by its own depth, so a single style write per frame
 * moves the whole composition and the layers separate the way real distance
 * would. Negative depth sits behind the figure and drifts against it.
 */
function layer(depth: number): CSSProperties {
  return {
    transform: `translate3d(calc(var(--mascot-tx, 0px) * ${depth}), calc(var(--mascot-ty, 0px) * ${depth}), 0)`,
    willChange: 'transform',
  };
}

const figure: CSSProperties = {
  transform: [
    'perspective(1600px)',
    'rotateX(var(--mascot-rx, 0deg))',
    'rotateY(var(--mascot-ry, 0deg))',
    'translate3d(var(--mascot-tx, 0px), var(--mascot-ty, 0px), 0)',
    'scale(var(--mascot-scale, 1))',
  ].join(' '),
  transformOrigin: '50% 82%',
  willChange: 'transform',
};

/**
 * The shell both mascot layers live in: a pool of light behind, a contact
 * shadow on the ground, and the entrance. Decorative throughout — it is marked
 * `aria-hidden` and never takes pointer input, so the mascot can overlap the
 * composition without ever standing between the visitor and a control.
 */
export function MascotStage({
  variant,
  reducedMotion,
  stageRef,
  className,
  children,
}: {
  variant: MascotVariant;
  reducedMotion: boolean;
  stageRef: React.RefObject<HTMLDivElement>;
  className?: string;
  children: ReactNode;
}) {
  const entrance = ENTRANCE[variant];

  return (
    <motion.div
      ref={stageRef}
      data-mascot-stage=""
      aria-hidden
      initial={reducedMotion ? false : { opacity: 0, y: 22, scale: 0.968 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: entrance.duration, delay: entrance.delay, ease: EASE }}
      className={cn('pointer-events-none relative isolate select-none', className)}
    >
      {/* No pool of light behind the figure: anything lighter than the page
          reads as a halo around the silhouette, which is exactly the sticker
          look this composition must not have. The figure carries its own
          lighting; the page stays onyx right up to the edge of the fur. */}

      {/* Contact shadow: what keeps the figure standing on the page. */}
      <div className="absolute inset-x-[14%] bottom-[1%] -z-10 h-[7%]" style={layer(0.55)}>
        <div
          className="h-full w-full"
          style={{
            background:
              'radial-gradient(ellipse at 50% 50%, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.32) 46%, rgba(0,0,0,0) 74%)',
          }}
        />
      </div>

      <div className="h-full w-full" style={reducedMotion ? undefined : figure}>
        {children}
      </div>
    </motion.div>
  );
}
