import { useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { dropdownVariants } from '@/lib/motion';
import { useClickOutside } from '@/hooks/useClickOutside';
import { useDisclosure } from '@/hooks/useDisclosure';

export interface DropdownProps {
  trigger: (props: { open: boolean; toggle: () => void }) => React.ReactNode;
  children: (props: { close: () => void }) => React.ReactNode;
  align?: 'left' | 'right';
  width?: string;
}

export function Dropdown({ trigger, children, align = 'right', width = 'w-56' }: DropdownProps) {
  const ref = useRef<HTMLDivElement>(null);
  const { isOpen, toggle, close } = useDisclosure();
  useClickOutside(ref, close, isOpen);

  return (
    <div ref={ref} className="relative">
      {trigger({ open: isOpen, toggle })}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="initial"
            animate="animate"
            exit="exit"
            role="menu"
            className={cn(
              'absolute z-40 mt-2 overflow-hidden rounded-lg border border-line-strong bg-elevated p-1 shadow-float',
              align === 'right' ? 'right-0' : 'left-0',
              width,
            )}
          >
            {children({ close })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function DropdownItem({
  children,
  onClick,
  icon,
  tone = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  icon?: React.ReactNode;
  tone?: 'default' | 'danger';
}) {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2.5 rounded px-2.5 py-2 text-left text-[13px] transition-colors duration-100',
        tone === 'danger'
          ? 'text-danger hover:bg-danger-wash'
          : 'text-ink-muted hover:bg-surface-hover hover:text-ink',
      )}
    >
      {icon && <span className="shrink-0 [&_svg]:h-3.5 [&_svg]:w-3.5">{icon}</span>}
      {children}
    </button>
  );
}

export function DropdownLabel({ children }: { children: React.ReactNode }) {
  return <p className="px-2.5 pb-1 pt-2 text-2xs font-medium uppercase tracking-label text-ink-ghost">{children}</p>;
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-line" />;
}
