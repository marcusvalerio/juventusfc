import { motion } from 'framer-motion';
import { cn } from '@/lib/cn';
import { springSoft } from '@/lib/motion';

export interface TabItem {
  value: string;
  label: string;
  count?: number;
}

export function Tabs({
  items,
  value,
  onChange,
  className,
}: {
  items: TabItem[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
}) {
  return (
    <div role="tablist" className={cn('flex items-center gap-1 border-b border-line', className)}>
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative px-3 pb-2.5 pt-1 text-[13px] transition-colors duration-150',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            <span className="flex items-center gap-1.5">
              {item.label}
              {item.count != null && (
                <span className={cn('tabular text-2xs', active ? 'text-gold' : 'text-ink-ghost')}>{item.count}</span>
              )}
            </span>
            {active && (
              <motion.span
                layoutId="tab-underline"
                transition={springSoft}
                className="absolute inset-x-0 -bottom-px h-px bg-gold"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}

/** Compact toggle used for view switches (mês/semana, tabela/cards). */
export function SegmentedControl({
  items,
  value,
  onChange,
  size = 'md',
  className,
}: {
  items: { value: string; label: string; icon?: React.ReactNode }[];
  value: string;
  onChange: (value: string) => void;
  size?: 'sm' | 'md';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'inline-flex items-center gap-0.5 rounded-md border border-line bg-surface-sunken p-0.5',
        className,
      )}
    >
      {items.map((item) => {
        const active = item.value === value;
        return (
          <button
            key={item.value}
            type="button"
            aria-pressed={active}
            onClick={() => onChange(item.value)}
            className={cn(
              'relative flex items-center gap-1.5 rounded px-2.5 transition-colors duration-150',
              size === 'sm' ? 'h-6 text-2xs' : 'h-7 text-[13px]',
              active ? 'text-ink' : 'text-ink-muted hover:text-ink',
            )}
          >
            {active && (
              <motion.span
                layoutId={`segment-${items.map((i) => i.value).join('-')}`}
                transition={springSoft}
                className="absolute inset-0 rounded bg-surface-hover"
              />
            )}
            <span className="relative z-10 flex items-center gap-1.5 [&_svg]:h-3.5 [&_svg]:w-3.5">
              {item.icon}
              {item.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
