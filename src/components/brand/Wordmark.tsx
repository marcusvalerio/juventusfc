import { cn } from '@/lib/cn';
import { Crest } from './Crest';
import { useSession } from '@/app/SessionContext';

/**
 * Institutional lockup. Sentient carries the name — nothing else does.
 * The name comes from the club record, so the mark belongs to whichever
 * organisation the instance was configured for.
 */
export function Wordmark({
  size = 'md',
  withCrest = true,
  name,
  className,
}: {
  size?: 'sm' | 'md' | 'lg';
  withCrest?: boolean;
  name?: string;
  className?: string;
}) {
  const { club, publicClub } = useSession();
  const label = name ?? club?.shortName ?? publicClub?.shortName ?? 'Clube';
  // The last token (e.g. "F.C.") is picked out in gold.
  const parts = label.trim().split(/\s+/);
  const lead = parts.length > 1 ? parts.slice(0, -1).join(' ') : label;
  const tail = parts.length > 1 ? parts[parts.length - 1] : '';
  const type = {
    sm: 'text-[15px]',
    md: 'text-lg',
    lg: 'text-2xl',
  }[size];

  const crest = { sm: 'h-6', md: 'h-7', lg: 'h-9' }[size];

  return (
    <span className={cn('inline-flex items-center gap-2.5', className)}>
      {withCrest && <Crest className={crest} />}
      <span className={cn('truncate font-display font-medium leading-none tracking-editorial text-ink', type)}>
        {lead} {tail && <span className="text-gold">{tail}</span>}
      </span>
    </span>
  );
}
