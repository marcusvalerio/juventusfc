/**
 * Placeholder transport for the next phase.
 *
 * When the API exists, repositories in this folder switch from the in-memory
 * implementation to calls made through this client. Auth headers, error
 * envelopes and retries land here — not in the screens.
 */
export const API_BASE_URL = import.meta.env.VITE_API_URL ?? '/api';

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      // Authorization is injected here once sessions exist.
      ...init?.headers,
    },
  });

  if (!response.ok) {
    throw new ApiError(`Falha na requisição: ${path}`, response.status);
  }
  return (await response.json()) as T;
}
