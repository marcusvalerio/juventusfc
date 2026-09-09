import { motion } from 'framer-motion';
import { DUR, EASE } from '@/lib/motion';
import { Crest } from '@/components/brand/Crest';
import { cn } from '@/lib/cn';

/**
 * Shared frame for the screens seen before signing in — login, first access and
 * bootstrap failures. Keeping them in one shell means every public state looks
 * like part of the platform instead of a generic admin page.
 */
export function PublicScreen({
  eyebrow,
  title,
  backdrop,
  children,
  footer,
  width = 'sm',
}: {
  eyebrow: string;
  title: string;
  /** Oversized word behind the composition; falls back to the club's name. */
  backdrop?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  width?: 'sm' | 'md';
}) {
  return (
    <div className="grain relative flex min-h-screen flex-col items-center justify-center overflow-hidden bg-onyx px-6 py-12">
      {backdrop && (
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

      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: DUR.editorial, ease: EASE }}
        className={cn('relative z-10 w-full', width === 'sm' ? 'max-w-sm' : 'max-w-md')}
      >
        <div className="mb-8 flex flex-col items-center text-center">
          <Crest className="mb-6 h-10" />
          <p className="eyebrow">{eyebrow}</p>
          <h1 className="mt-3 font-display text-3xl font-medium tracking-tightest text-ink">{title}</h1>
        </div>

        {children}

        {footer && <div className="mt-6 text-center">{footer}</div>}
      </motion.div>
    </div>
  );
}
