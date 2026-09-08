import type { Entity } from '@/types/domain';

/**
 * In-memory repository standing in for the future data layer.
 *
 * Every read is asynchronous on purpose: the UI is written against promises,
 * so replacing these implementations with HTTP calls (see `http.ts`) is a
 * swap of the module body, not a rewrite of the screens. The artificial
 * latency also keeps the loading and skeleton states honest during the demo.
 */

export interface ListQuery {
  search?: string;
  filters?: Record<string, string | undefined>;
  sort?: { key: string; direction: 'asc' | 'desc' };
}

export interface Repository<T extends { id: string }> {
  list(query?: ListQuery): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Omit<T, keyof Entity>): Promise<T>;
  update(id: string, patch: Partial<T>): Promise<T>;
  remove(id: string): Promise<void>;
}

const LATENCY = { min: 180, max: 420 };

const delay = () =>
  new Promise<void>((resolve) =>
    setTimeout(resolve, LATENCY.min + Math.random() * (LATENCY.max - LATENCY.min)),
  );

const nextId = (prefix: string) => `${prefix}-${Math.random().toString(36).slice(2, 8)}`;

export interface RepositoryOptions<T> {
  /** Fields scanned by the shared search box. */
  searchable?: (keyof T)[];
  idPrefix?: string;
}

export function createRepository<T extends { id: string } & Partial<Entity>>(
  seed: T[],
  options: RepositoryOptions<T> = {},
): Repository<T> {
  // Cloned so mutations during the session never leak back into the seed module.
  let records: T[] = seed.map((item) => ({ ...item }));
  const { searchable = [], idPrefix = 'rec' } = options;

  const matchesSearch = (record: T, term: string) => {
    const needle = term.trim().toLowerCase();
    if (!needle) return true;
    const fields = searchable.length ? searchable : (Object.keys(record) as (keyof T)[]);
    return fields.some((field) => String(record[field] ?? '').toLowerCase().includes(needle));
  };

  const matchesFilters = (record: T, filters: ListQuery['filters']) => {
    if (!filters) return true;
    return Object.entries(filters).every(([key, value]) => {
      if (!value || value === 'todos') return true;
      return String((record as Record<string, unknown>)[key] ?? '') === value;
    });
  };

  return {
    async list(query = {}) {
      await delay();
      let out = records.filter(
        (record) => matchesSearch(record, query.search ?? '') && matchesFilters(record, query.filters),
      );
      if (query.sort) {
        const { key, direction } = query.sort;
        out = [...out].sort((a, b) => {
          const av = (a as Record<string, unknown>)[key];
          const bv = (b as Record<string, unknown>)[key];
          if (av === bv) return 0;
          if (av == null) return 1;
          if (bv == null) return -1;
          const result = typeof av === 'number' && typeof bv === 'number'
            ? av - bv
            : String(av).localeCompare(String(bv), 'pt-BR');
          return direction === 'asc' ? result : -result;
        });
      }
      return out;
    },

    async get(id) {
      await delay();
      return records.find((record) => record.id === id);
    },

    async create(input) {
      await delay();
      const now = new Date().toISOString();
      const record = { ...(input as object), id: nextId(idPrefix), createdAt: now, updatedAt: now } as T;
      records = [record, ...records];
      return record;
    },

    async update(id, patch) {
      await delay();
      let updated: T | undefined;
      records = records.map((record) => {
        if (record.id !== id) return record;
        updated = { ...record, ...patch, updatedAt: new Date().toISOString() };
        return updated;
      });
      if (!updated) throw new Error(`Registro não encontrado: ${id}`);
      return updated;
    },

    async remove(id) {
      await delay();
      records = records.filter((record) => record.id !== id);
    },
  };
}
