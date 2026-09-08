import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { AlertTriangle, Check, Info, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';

type ToastTone = 'success' | 'error' | 'info';

interface Toast {
  id: number;
  tone: ToastTone;
  title: string;
  description?: string;
}

interface ToastContextValue {
  notify: (toast: Omit<Toast, 'id'>) => void;
  success: (title: string, description?: string) => void;
  error: (title: string, description?: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const TONE_STYLES: Record<ToastTone, { icon: React.ReactNode; accent: string }> = {
  success: { icon: <Check />, accent: 'text-success' },
  error: { icon: <AlertTriangle />, accent: 'text-danger' },
  info: { icon: <Info />, accent: 'text-gold-light' },
};

let sequence = 0;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const notify = useCallback(
    (toast: Omit<Toast, 'id'>) => {
      sequence += 1;
      const id = sequence;
      setToasts((current) => [...current.slice(-2), { ...toast, id }]);
      setTimeout(() => dismiss(id), 4200);
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      notify,
      success: (title, description) => notify({ tone: 'success', title, description }),
      error: (title, description) => notify({ tone: 'error', title, description }),
    }),
    [notify],
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      {createPortal(
        <div className="pointer-events-none fixed bottom-5 right-5 z-[60] flex w-[min(360px,calc(100vw-2.5rem))] flex-col gap-2">
          <AnimatePresence initial={false}>
            {toasts.map((toast) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: 16, scale: 0.97 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, x: 24, scale: 0.98, transition: { duration: 0.16 } }}
                transition={springSoft}
                role="status"
                className="pointer-events-auto flex items-start gap-3 rounded-lg border border-line-strong bg-elevated p-3.5 shadow-float"
              >
                <span className={cn('mt-0.5 shrink-0 [&_svg]:h-4 [&_svg]:w-4', TONE_STYLES[toast.tone].accent)}>
                  {TONE_STYLES[toast.tone].icon}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] font-medium text-ink">{toast.title}</p>
                  {toast.description && (
                    <p className="mt-0.5 text-2xs leading-relaxed text-ink-muted">{toast.description}</p>
                  )}
                </div>
                <button
                  type="button"
                  aria-label="Fechar aviso"
                  onClick={() => dismiss(toast.id)}
                  className="-mr-1 -mt-1 rounded p-1 text-ink-ghost transition-colors hover:text-ink"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>,
        document.body,
      )}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast precisa estar dentro de ToastProvider.');
  return context;
}
