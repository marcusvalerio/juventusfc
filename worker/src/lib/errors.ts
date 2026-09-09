import type { Context } from 'hono';

/**
 * One error envelope for the whole API:
 *   { error: { code, message, details? } }
 * Messages are safe to show to a user; they never leak which field of a
 * credential was wrong, nor any database detail.
 */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export const badRequest = (message: string, details?: unknown) =>
  new ApiError(400, 'bad_request', message, details);

export const unauthorized = (message = 'Sessão inválida ou expirada.') =>
  new ApiError(401, 'unauthorized', message);

export const forbidden = (message = 'Você não tem autorização para esta ação.') =>
  new ApiError(403, 'forbidden', message);

export const notFound = (message = 'Registro não encontrado.') =>
  new ApiError(404, 'not_found', message);

export const conflict = (message: string, details?: unknown) =>
  new ApiError(409, 'conflict', message, details);

export function errorResponse(c: Context, error: unknown) {
  if (error instanceof ApiError) {
    return c.json(
      { error: { code: error.code, message: error.message, details: error.details } },
      error.status as 400,
    );
  }

  // Never surface an internal message (it can carry SQL or stack details).
  console.error('unhandled_error', error instanceof Error ? error.message : String(error));
  return c.json(
    { error: { code: 'internal_error', message: 'Erro interno. Tente novamente.' } },
    500,
  );
}
