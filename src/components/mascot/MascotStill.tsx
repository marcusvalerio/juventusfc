import { cn } from '@/lib/cn';
import { MASCOT_ARTWORK } from './mascotConfig';

/**
 * The figure as artwork.
 *
 * This is what stands in for the model until `public/models/juventus-mascot.glb`
 * exists, and what remains on hardware that cannot run WebGL. It is a still: the
 * depth around it comes from the stage, not from pretending a bitmap is a mesh.
 */
export function MascotStill({ priority = false, className }: { priority?: boolean; className?: string }) {
  return (
    <picture>
      <source
        type="image/webp"
        srcSet={`${MASCOT_ARTWORK.webpSmall} 520w, ${MASCOT_ARTWORK.webp} 900w`}
        sizes="(min-width: 1024px) 44vw, 74vw"
      />
      <img
        src={MASCOT_ARTWORK.png}
        alt=""
        width={MASCOT_ARTWORK.width}
        height={MASCOT_ARTWORK.height}
        loading={priority ? 'eager' : 'lazy'}
        decoding="async"
        draggable={false}
        className={cn('h-full w-full select-none object-contain object-bottom', className)}
      />
    </picture>
  );
}
