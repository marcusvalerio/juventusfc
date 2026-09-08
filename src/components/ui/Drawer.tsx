import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { drawerVariants, overlayVariants } from '@/lib/motion';
import { IconButton } from './Button';

export interface DrawerProps {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  footer?: React.ReactNode;
  width?: 'sm' | 'md';
  children: React.ReactNode;
}

/** Side panel for record detail — keeps the list context visible behind it. */
export function Drawer({ open, onClose, title, subtitle, footer, width = 'md', children }: DrawerProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50">
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-onyx/75 backdrop-blur-[2px]"
          />
          <motion.aside
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={drawerVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'absolute right-0 top-0 flex h-full w-full flex-col border-l border-line-strong bg-graphite shadow-float',
              width === 'sm' ? 'sm:w-[420px]' : 'sm:w-[560px]',
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                {subtitle && <p className="eyebrow mb-1.5">{subtitle}</p>}
                <h2 className="truncate font-heading text-lg font-medium tracking-editorial text-ink">{title}</h2>
              </div>
              <IconButton label="Fechar" onClick={onClose} className="-mr-2 -mt-1">
                <X />
              </IconButton>
            </header>
            <div className="flex-1 overflow-y-auto px-6 py-5">{children}</div>
            {footer && (
              <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-sunken/60 px-6 py-4">
                {footer}
              </footer>
            )}
          </motion.aside>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
