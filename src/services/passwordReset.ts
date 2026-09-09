import { apiFetch } from './api';

/**
 * Password recovery calls.
 *
 * `request` never reports whether the address matched an account — the API
 * answers the same way either way, and the screen shows that answer verbatim.
 */
export const passwordResetService = {
  request: (email: string) =>
    apiFetch<{ ok: true; message: string }>('/auth/forgot-password', {
      method: 'POST',
      body: { email },
    }),

  /** Lets the reset screen refuse a dead link before asking for a password. */
  check: (token: string) =>
    apiFetch<{ valid: boolean; expiresAt?: string }>('/auth/reset-password/check', {
      method: 'POST',
      body: { token },
    }),

  confirm: (token: string, password: string, confirmPassword: string) =>
    apiFetch<{ ok: true; message: string }>('/auth/reset-password', {
      method: 'POST',
      body: { token, password, confirmPassword },
    }),
};
