import { motion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { Mascot3D } from '@/components/mascot';
import { useIsDesktop } from '@/hooks/useMediaQuery';
import { cn } from '@/lib/cn';
import type { MascotVariant } from '@/components/mascot';

/**
 * Shared frame for the screens seen before signing in — login, first access and
 * bootstrap failures. Keeping them in one shell means every public state looks
 * like part of the platform instead of a generic admin page.
 *
 * Passing `mascot` puts the club's mascot alongside the composition: beside the
 * card on a wide screen, far behind it on a narrow one. It never becomes the
 * subject — the form does — and screens that leave it unset render exactly as
 * they did before.
 */
export function PublicScreen({
  eyebrow,
  title,
  backdrop,
  children,
  footer,
  width = 'sm',
  mascot,
}: {
  eyebrow: string;
  title: string;
  /** Oversized word behind the composition; falls back to the club's name. */
  backdrop?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md';
  /** Stands the mascot next to the card. Omit for a plain screen. */
  mascot?: MascotVariant;
}) {
  const isDesktop = useIsDesktop();

  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-onyx px-6 py-12">
      {/* The mascot replaces the oversized word rather than competing with it. */}
      {backdrop && !mascot && (
        <motion.div
          aria-hidden
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 1.4, ease: EASE }}
          className="pointer-events-none absolute inset-0 flex items-center justify-center"
        >
          <span className="whitespace-nowrap font-display text-[26vw] font-medium leading-none tracking-tightest text-ink opacity-[0.03]">
            {backdrop}
          </span>
        </motion.div>
      )}

      {/* Narrow screens: the figure withdraws to the back of the room. The card
          is opaque, so nothing it sits behind loses contrast. */}
      {mascot && !isDesktop && (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 flex items-end justify-center opacity-[0.10]"
        >
          <div className="h-[74%] w-[min(440px,128%)]">
            <Mascot3D variant="login" state="login" intensity={0.35} />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-onyx via-onyx/55 to-onyx" />
        </div>
      )}

      <div
        className={cn(
          'relative z-10 flex w-full items-center',
          mascot ? 'max-w-5xl justify-center lg:justify-between lg:gap-10' : 'justify-center',
        )}
      >
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: DUR.editorial, ease: EASE }}
          className={cn('w-full shrink-0', width === 'sm' ? 'max-w-sm' : 'max-w-md')}
        >
          <div className="mb-8 flex flex-col items-center text-center">
            <Crest className="mb-6 h-10" />
            <p className="eyebrow">{eyebrow}</p>
            <h1 className="mt-3 font-display text-3xl font-medium tracking-tightest text-ink">{title}</h1>
          </div>

          {children}

          {footer && <div className="mt-6 text-center">{footer}</div>}
        </motion.div>

        {/* Present, not competing: smaller than on the portal, held back in
            opacity, and pushed toward the edge so the form keeps the stage. */}
        {mascot && isDesktop && (
          <div className="h-[min(62vh,540px)] w-[40%] max-w-[430px] shrink-0 opacity-[0.72] xl:-mr-16">
            <Mascot3D variant={mascot} state="login" intensity={0.5} />
          </div>
        )}
      </div>
    </div>
  );
}
