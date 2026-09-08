import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { modalVariants, overlayVariants } from '@/lib/motion';
import { IconButton } from './Button';

export interface ModalProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  size?: 'sm' | 'md' | 'lg';
  footer?: React.ReactNode;
  children: React.ReactNode;
}

const SIZES = { sm: 'max-w-md', md: 'max-w-2xl', lg: 'max-w-4xl' };

export function Modal({ open, onClose, title, description, size = 'md', footer, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = previous;
    };
  }, [open, onClose]);

  return createPortal(
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center p-0 sm:items-center sm:p-6">
          <motion.div
            variants={overlayVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            onClick={onClose}
            className="absolute inset-0 bg-onyx/80 backdrop-blur-[2px]"
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            variants={modalVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            className={cn(
              'relative flex max-h-[90vh] w-full flex-col overflow-hidden rounded-t-xl border border-line-strong',
              'bg-graphite shadow-float sm:rounded-xl',
              SIZES[size],
            )}
          >
            <header className="flex items-start justify-between gap-4 border-b border-line px-6 py-5">
              <div className="min-w-0">
                <h2 className="font-heading text-base font-medium tracking-editorial text-ink">{title}</h2>
                {description && <p className="mt-1 text-[13px] leading-relaxed text-ink-muted">{description}</p>}
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
          </motion.div>
        </div>
      )}
    </AnimatePresence>,
    document.body,
  );
}
