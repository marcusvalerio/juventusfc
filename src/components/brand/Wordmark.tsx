import { cn } from '@/lib/cn';
import { Crest } from './Crest';

/** Institutional lockup. Sentient carries the name — nothing else does. */
export function Wordmark({
  size = 'md',
  withCrest = true,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  withCrest?: boolean;
  className?: string;
}) {
  const type = {
    sm: 'text-[15px]',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const crest = { sm: 'h-6', md: 'h-7', lg: 'h-9' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {withCrest && <Crest className={crest} />}
      <span className={cn('font-display font-medium leading-none tracking-editorial text-ink', type)}>
        Juventus <span className="text-gold">F.C.</span>
      </span>
    </span>
  );
}
