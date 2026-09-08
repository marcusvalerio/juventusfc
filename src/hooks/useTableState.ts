import { useCallback, useMemo, useState } from 'react';

export interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

export interface TableStateOptions {
  pageSize?: number;
  initialSort?: SortState;
  initialFilters?: Record<string, string>;
}

/**
 * Client-side search / filter / sort / pagination.
 * The same state object maps 1:1 onto the repository `ListQuery`, so moving
 * this work to the server later is a change of caller, not of component.
 */
export function useTableState<T>(
  rows: T[] | undefined,
  searchKeys: (keyof T)[],
  options: TableStateOptions = {},
) {
  const { pageSize = 10, initialSort, initialFilters = {} } = options;
  const [search, setSearchValue] = useState('');
  const [filters, setFilters] = useState<Record<string, string>>(initialFilters);
  const [sort, setSort] = useState<SortState | undefined>(initialSort);
  const [page, setPage] = useState(1);

  const setSearch = useCallback((value: string) => {
    setSearchValue(value);
    setPage(1);
  }, []);

  const setFilter = useCallback((key: string, value: string) => {
    setFilters((current) => ({ ...current, [key]: value }));
    setPage(1);
  }, []);

  const resetFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchValue('');
    setPage(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleSort = useCallback((key: string) => {
    setSort((current) =>
      current?.key === key
        ? { key, direction: current.direction === 'asc' ? 'desc' : 'asc' }
        : { key, direction: 'asc' },
    );
  }, []);

  const filtered = useMemo(() => {
    if (!rows) return [];
    const needle = search.trim().toLowerCase();
    let out = rows.filter((row) => {
      const record = row as Record<string, unknown>;
      const matchesSearch =
        !needle ||
        searchKeys.some((key) => String(record[key as string] ?? '').toLowerCase().includes(needle));
      const matchesFilters = Object.entries(filters).every(([key, value]) => {
        if (!value || value === 'todos') return true;
        return String(record[key] ?? '') === value;
      });
      return matchesSearch && matchesFilters;
    });

    if (sort) {
      out = [...out].sort((a, b) => {
        const av = (a as Record<string, unknown>)[sort.key];
        const bv = (b as Record<string, unknown>)[sort.key];
        if (av == null && bv == null) return 0;
        if (av == null) return 1;
        if (bv == null) return -1;
        const result =
          typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), 'pt-BR', { numeric: true });
        return sort.direction === 'asc' ? result : -result;
      });
    }
    return out;
  }, [rows, search, filters, sort, searchKeys]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const paged = useMemo(
    () => filtered.slice((safePage - 1) * pageSize, safePage * pageSize),
    [filtered, safePage, pageSize],
  );

  const activeFilterCount =
    Object.values(filters).filter((value) => value && value !== 'todos').length + (search ? 1 : 0);

  return {
    search,
    setSearch,
    filters,
    setFilter,
    resetFilters,
    sort,
    toggleSort,
    page: safePage,
    setPage,
    pageCount,
    pageSize,
    rows: paged,
    total: filtered.length,
    sourceTotal: rows?.length ?? 0,
    activeFilterCount,
  };
}
