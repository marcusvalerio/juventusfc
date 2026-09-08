import { AnimatePresence, motion } from 'framer-motion';
import { Search as SearchIcon, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';

export function SearchInput({
  value,
  onChange,
  placeholder = 'Buscar…',
  className,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={cn('group relative', className)}>
      <SearchIcon
        className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-ghost transition-colors duration-150 group-focus-within:text-gold"
        aria-hidden
      />
      <input
        type="search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(
          'h-9 w-full rounded-md border border-line-strong bg-surface-sunken pl-9 pr-8 text-sm text-ink',
          'transition-colors duration-150 placeholder:text-ink-ghost hover:border-[rgba(244,244,242,0.2)]',
          'focus:border-[rgba(201,162,39,0.45)] focus:outline-none',
          '[&::-webkit-search-cancel-button]:appearance-none',
        )}
      />
      <AnimatePresence>
        {value && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            onClick={() => onChange('')}
            aria-label="Limpar busca"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-ink-ghost transition-colors hover:text-ink"
          >
            <X className="h-3.5 w-3.5" />
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
