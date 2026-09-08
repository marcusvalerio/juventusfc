import { AnimatePresence, motion } from 'framer-motion';
import { ArrowUpDown, ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/cn';
import { rowItem, staggerContainer } from '@/lib/motion';
import { EmptyState, ErrorState, TableSkeleton } from '@/components/ui/States';
import { Pagination } from '@/components/ui/Pagination';
import type { SortState } from '@/hooks/useTableState';

export interface Column<T> {
  key: string;
  header: string;
  /** Falls back to `row[key]` when omitted. */
  render?: (row: T) => React.ReactNode;
  align?: 'left' | 'right' | 'center';
  sortable?: boolean;
  width?: string;
  /** Hidden below the lg breakpoint — keeps the mobile table readable. */
  secondary?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  rows: T[];
  status?: 'loading' | 'success' | 'error';
  sort?: SortState;
  onSort?: (key: string) => void;
  onRowClick?: (row: T) => void;
  getRowId: (row: T) => string;
  empty?: { title: string; description?: string; action?: React.ReactNode };
  onRetry?: () => void;
  toolbar?: React.ReactNode;
  pagination?: { page: number; pageCount: number; total: number; pageSize: number; onChange: (page: number) => void };
  className?: string;
}

const ALIGN = { left: 'text-left', right: 'text-right', center: 'text-center' };

export function DataTable<T>({
  columns,
  rows,
  status = 'success',
  sort,
  onSort,
  onRowClick,
  getRowId,
  empty,
  onRetry,
  toolbar,
  pagination,
  className,
}: DataTableProps<T>) {
  const showBody = status === 'success' && rows.length > 0;

  return (
    <div className={cn('overflow-hidden rounded-lg border border-line bg-graphite', className)}>
      {toolbar && <div className="border-b border-line px-5 py-3">{toolbar}</div>}

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-line">
              {columns.map((column) => {
                const isSorted = sort?.key === column.key;
                return (
                  <th
                    key={column.key}
                    scope="col"
                    style={{ width: column.width }}
                    className={cn(
                      'px-5 py-3 text-2xs font-medium uppercase tracking-label text-ink-faint',
                      ALIGN[column.align ?? 'left'],
                      column.secondary && 'hidden lg:table-cell',
                    )}
                  >
                    {column.sortable && onSort ? (
                      <button
                        type="button"
                        onClick={() => onSort(column.key)}
                        className={cn(
                          // `uppercase` is repeated here: form controls do not inherit text-transform.
                          'inline-flex items-center gap-1 uppercase tracking-label transition-colors duration-150 hover:text-ink',
                          isSorted && 'text-gold',
                          column.align === 'right' && 'flex-row-reverse',
                        )}
                        aria-label={`Ordenar por ${column.header}`}
                      >
                        {column.header}
                        {isSorted ? (
                          sort.direction === 'asc' ? (
                            <ChevronUp className="h-3 w-3" />
                          ) : (
                            <ChevronDown className="h-3 w-3" />
                          )
                        ) : (
                          <ArrowUpDown className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>

          {showBody && (
            <motion.tbody variants={staggerContainer(0.022)} initial="initial" animate="animate">
              <AnimatePresence initial={false}>
                {rows.map((row) => (
                  <motion.tr
                    key={getRowId(row)}
                    variants={rowItem}
                    exit="exit"
                    layout="position"
                    onClick={onRowClick ? () => onRowClick(row) : undefined}
                    tabIndex={onRowClick ? 0 : undefined}
                    onKeyDown={
                      onRowClick
                        ? (event) => {
                            if (event.key === 'Enter' || event.key === ' ') {
                              event.preventDefault();
                              onRowClick(row);
                            }
                          }
                        : undefined
                    }
                    className={cn(
                      'group border-b border-line last:border-b-0 transition-colors duration-150',
                      onRowClick && 'cursor-pointer hover:bg-surface-raised focus:bg-surface-raised focus:outline-none',
                    )}
                  >
                    {columns.map((column) => (
                      <td
                        key={column.key}
                        className={cn(
                          'px-5 py-3.5 align-middle text-[13px] text-ink-muted',
                          ALIGN[column.align ?? 'left'],
                          column.secondary && 'hidden lg:table-cell',
                        )}
                      >
                        {column.render
                          ? column.render(row)
                          : String((row as Record<string, unknown>)[column.key] ?? '—')}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </AnimatePresence>
            </motion.tbody>
          )}
        </table>
      </div>

      {status === 'loading' && <TableSkeleton columns={Math.min(columns.length, 6)} />}
      {status === 'error' && <ErrorState onRetry={onRetry} />}
      {status === 'success' && rows.length === 0 && (
        <EmptyState
          compact
          title={empty?.title ?? 'Nenhum registro encontrado'}
          description={empty?.description ?? 'Ajuste a busca ou os filtros para ver outros resultados.'}
          action={empty?.action}
        />
      )}

      {pagination && showBody && <Pagination {...pagination} />}
    </div>
  );
}
