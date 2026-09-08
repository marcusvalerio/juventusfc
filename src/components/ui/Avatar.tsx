import { cn } from '@/lib/cn';
import { initials as toInitials } from '@/lib/format';

const SIZES = {
  sm: 'h-7 w-7 text-2xs',
  md: 'h-9 w-9 text-[13px]',
  lg: 'h-12 w-12 text-sm',
  xl: 'h-16 w-16 text-lg',
};

export function Avatar({
  name,
  size = 'md',
  tone = 'neutral',
  className,
}: {
  name: string;
  size?: keyof typeof SIZES;
  tone?: 'neutral' | 'gold';
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full border font-heading font-medium tracking-tight',
        tone === 'gold'
          ? 'border-line-gold bg-gold-wash text-gold-light'
          : 'border-line-strong bg-surface-raised text-ink-muted',
        SIZES[size],
        className,
      )}
    >
      {toInitials(name)}
    </span>
  );
}

const SHIRT_SIZES = {
  md: 'h-7 w-7 rounded text-[13px]',
  lg: 'h-14 w-14 rounded-lg text-2xl',
};

/** Shirt number chip — the squad's own visual signature. */
export function ShirtNumber({
  value,
  size = 'md',
  className,
}: {
  value?: number;
  size?: keyof typeof SHIRT_SIZES;
  className?: string;
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center justify-center border border-line bg-surface-sunken',
        'tabular font-heading font-medium text-gold-light',
        SHIRT_SIZES[size],
        className,
      )}
    >
      {value ?? '—'}
    </span>
  );
}
