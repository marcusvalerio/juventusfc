/**
 * HTTP client for the Worker API.
 *
 * Session state travels in an HttpOnly cookie, so every call sends credentials
 * and no token is ever kept in JavaScript. Failures are surfaced as ApiError
 * with the server's structured envelope — the UI must never silently degrade a
 * failed request into an empty list.
 */

export const API_BASE = '/api';

export interface ApiErrorPayload {
  code: string;
  message: string;
  details?: Record<string, string>;
}

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: Record<string, string>,
  ) {
    super(message);
    this.name = 'ApiError';
  }

  /** True when the session is gone and the app should return to the login screen. */
  get isUnauthorized() {
    return this.status === 401;
  }

  get isForbidden() {
    return this.status === 403;
  }
}

type Method = 'GET' | 'POST' | 'PUT' | 'DELETE';

interface RequestOptions {
  method?: Method;
  body?: unknown;
  signal?: AbortSignal;
}

/** Notified whenever the API reports the session is no longer valid. */
type UnauthorizedHandler = () => void;
let onUnauthorized: UnauthorizedHandler | null = null;
export const setUnauthorizedHandler = (handler: UnauthorizedHandler | null) => {
  onUnauthorized = handler;
};

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', body, signal } = options;

  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'same-origin',
      headers: body === undefined ? undefined : { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (cause) {
    if ((cause as Error)?.name === 'AbortError') throw cause;
    throw new ApiError(0, 'network_error', 'Não foi possível conectar ao servidor.');
  }

  if (response.status === 204) return undefined as T;

  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const envelope = (payload as { error?: ApiErrorPayload } | null)?.error;
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(
      response.status,
      envelope?.code ?? 'unknown_error',
      envelope?.message ?? 'Não foi possível concluir a operação.',
      envelope?.details,
    );
  }

  return payload as T;
}

/** Downloads a binary response (used by the spreadsheet exports). */
export async function apiDownload(path: string, filename: string): Promise<void> {
  const response = await fetch(`${API_BASE}${path}`, { credentials: 'same-origin' });

  if (!response.ok) {
    const text = await response.text();
    let envelope: ApiErrorPayload | undefined;
    try {
      envelope = (JSON.parse(text) as { error?: ApiErrorPayload }).error;
    } catch {
      envelope = undefined;
    }
    if (response.status === 401) onUnauthorized?.();
    throw new ApiError(
      response.status,
      envelope?.code ?? 'unknown_error',
      envelope?.message ?? 'Não foi possível gerar o arquivo.',
    );
  }

  const blob = await response.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so the click has already started the download.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
