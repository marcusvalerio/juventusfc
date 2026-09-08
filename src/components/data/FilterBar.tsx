import { AnimatePresence, motion } from 'framer-motion';
import { SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { DUR, EASE } from '@/lib/motion';
import { SearchInput } from '@/components/ui/Search';
import { Select, type SelectOption } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';

export interface FilterDefinition {
  key: string;
  label: string;
  options: SelectOption[];
}

export function FilterBar({
  search,
  onSearch,
  searchPlaceholder,
  filters = [],
  values = {},
  onFilter,
  onReset,
  activeCount = 0,
  trailing,
  className,
}: {
  search: string;
  onSearch: (value: string) => void;
  searchPlaceholder?: string;
  filters?: FilterDefinition[];
  values?: Record<string, string>;
  onFilter?: (key: string, value: string) => void;
  onReset?: () => void;
  activeCount?: number;
  trailing?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-wrap items-center gap-2.5', className)}>
      <SearchInput
        value={search}
        onChange={onSearch}
        placeholder={searchPlaceholder}
        className="w-full min-w-[200px] flex-1 sm:w-auto sm:max-w-xs"
      />

      {filters.map((filter) => (
        <Select
          key={filter.key}
          aria-label={filter.label}
          value={values[filter.key] ?? 'todos'}
          onChange={(event) => onFilter?.(filter.key, event.target.value)}
          options={[{ value: 'todos', label: filter.label }, ...filter.options]}
          className={cn(
            'w-auto min-w-[140px]',
            values[filter.key] && values[filter.key] !== 'todos' && 'border-line-gold text-gold-light',
          )}
        />
      ))}

      <AnimatePresence>
        {activeCount > 0 && onReset && (
          <motion.div
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: 'auto' }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: DUR.fast, ease: EASE }}
            className="overflow-hidden"
          >
            <Button variant="ghost" size="sm" icon={<X />} onClick={onReset} className="whitespace-nowrap">
              Limpar ({activeCount})
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {trailing && <div className="ml-auto flex items-center gap-2">{trailing}</div>}
    </div>
  );
}

export function FilterHint({ count, total }: { count: number; total: number }) {
  return (
    <p className="flex items-center gap-1.5 text-2xs text-ink-faint">
      <SlidersHorizontal className="h-3 w-3" aria-hidden />
      <span className="tabular">{count}</span> de <span className="tabular">{total}</span>
    </p>
  );
}
