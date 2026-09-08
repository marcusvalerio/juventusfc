import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/cn';
import { IconButton } from './Button';

export function Pagination({
  page,
  pageCount,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  pageCount: number;
  total: number;
  pageSize: number;
  onChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line px-5 py-3">
      <p className="tabular text-2xs text-ink-faint">
        <span className="text-ink-muted">{from}</span>–<span className="text-ink-muted">{to}</span> de{' '}
        <span className="text-ink-muted">{total}</span> registros
      </p>
      {pageCount > 1 && (
        <div className="flex items-center gap-1">
          <IconButton
            label="Página anterior"
            disabled={page === 1}
            onClick={() => onChange(page - 1)}
            className="h-7 w-7"
          >
            <ChevronLeft />
          </IconButton>
          <div className="flex items-center gap-0.5 px-1">
            {Array.from({ length: pageCount }).map((_, index) => {
              const target = index + 1;
              const isEdge = target === 1 || target === pageCount;
              const isNear = Math.abs(target - page) <= 1;
              if (!isEdge && !isNear) {
                return target === page - 2 || target === page + 2 ? (
                  <span key={target} className="px-1 text-2xs text-ink-ghost">
                    ·
                  </span>
                ) : null;
              }
              return (
                <button
                  key={target}
                  type="button"
                  onClick={() => onChange(target)}
                  aria-current={target === page ? 'page' : undefined}
                  className={cn(
                    'tabular h-7 min-w-7 rounded px-1.5 text-2xs transition-colors duration-150',
                    target === page
                      ? 'bg-gold-wash text-gold-light'
                      : 'text-ink-muted hover:bg-surface-raised hover:text-ink',
                  )}
                >
                  {target}
                </button>
              );
            })}
          </div>
          <IconButton
            label="Próxima página"
            disabled={page === pageCount}
            onClick={() => onChange(page + 1)}
            className="h-7 w-7"
          >
            <ChevronRight />
          </IconButton>
        </div>
      )}
    </div>
  );
}
