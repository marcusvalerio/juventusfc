import { apiFetch } from './api';

/**
 * Thin resource wrapper over the API.
 *
 * The shape kept from phase 1 (`list/get/create/update/remove`) is unchanged, so
 * screens written against the in-memory repositories keep working — only the
 * implementation moved from mocked arrays to HTTP.
 */
export interface Repository<T> {
  list(): Promise<T[]>;
  get(id: string): Promise<T | undefined>;
  create(input: Record<string, unknown>): Promise<T>;
  update(id: string, input: Record<string, unknown>): Promise<T>;
  remove(id: string): Promise<void>;
}

export function createResource<T>(basePath: string): Repository<T> {
  return {
    async list() {
      const result = await apiFetch<{ data: T[] }>(basePath);
      return result.data;
    },
    async get(id: string) {
      const result = await apiFetch<{ data: T }>(`${basePath}/${id}`);
      return result.data;
    },
    async create(input) {
      const result = await apiFetch<{ data: T }>(basePath, { method: 'POST', body: input });
      return result.data;
    },
    async update(id, input) {
      const result = await apiFetch<{ data: T }>(`${basePath}/${id}`, { method: 'PUT', body: input });
      return result.data;
    },
    async remove(id) {
      await apiFetch<{ ok: true }>(`${basePath}/${id}`, { method: 'DELETE' });
    },
  };
}
