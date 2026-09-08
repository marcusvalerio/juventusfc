import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';

export function Tooltip({
  label,
  children,
  side = 'top',
}: {
  label: string;
  children: React.ReactNode;
  side?: 'top' | 'bottom';
}) {
  const [visible, setVisible] = useState(false);

  return (
    <span
      className="relative inline-flex"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      <AnimatePresence>
        {visible && (
          <motion.span
            role="tooltip"
            initial={{ opacity: 0, y: side === 'top' ? 3 : -3 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className={cn(
              'pointer-events-none absolute left-1/2 z-50 -translate-x-1/2 whitespace-nowrap rounded border border-line-strong',
              'bg-elevated px-2 py-1 text-2xs text-ink shadow-raised',
              side === 'top' ? 'bottom-full mb-1.5' : 'top-full mt-1.5',
            )}
          >
            {label}
          </motion.span>
        )}
      </AnimatePresence>
    </span>
  );
}
