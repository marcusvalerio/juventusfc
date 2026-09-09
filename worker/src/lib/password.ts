/**
 * Password hashing for Cloudflare Workers.
 *
 * PBKDF2-HMAC-SHA256 via WebCrypto — bcrypt/scrypt/argon2 need native or WASM
 * builds that Workers cannot load, while a bare SHA-256 would be unsalted and
 * far too cheap to brute force. Iterations follow the OWASP recommendation and
 * are stored inside the hash string, so the cost can be raised later and old
 * hashes still verify.
 */

const ITERATIONS = 210_000;
const KEY_BITS = 256;
const SALT_BYTES = 16;

const toBase64 = (bytes: Uint8Array) => btoa(String.fromCharCode(...bytes));

const fromBase64 = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0));

async function derive(password: string, salt: Uint8Array, iterations: number) {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveBits'],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations },
    key,
    KEY_BITS,
  );
  return new Uint8Array(bits);
}

/** Returns `pbkdf2$sha256$<iterations>$<salt>$<hash>`. */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const hash = await derive(password, salt, ITERATIONS);
  return `pbkdf2$sha256$${ITERATIONS}$${toBase64(salt)}$${toBase64(hash)}`;
}

/** Constant-time comparison — a length or byte difference must not be timeable. */
function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split('$');
  if (parts.length !== 5 || parts[0] !== 'pbkdf2' || parts[1] !== 'sha256') return false;

  const iterations = Number(parts[2]);
  if (!Number.isInteger(iterations) || iterations < 1000) return false;

  try {
    const salt = fromBase64(parts[3]);
    const expected = fromBase64(parts[4]);
    const actual = await derive(password, salt, iterations);
    return timingSafeEqual(actual, expected);
  } catch {
    return false;
  }
}

export interface PasswordPolicyResult {
  ok: boolean;
  message?: string;
}

export function checkPasswordPolicy(password: string): PasswordPolicyResult {
  if (password.length < 8) return { ok: false, message: 'A senha precisa ter ao menos 8 caracteres.' };
  if (password.length > 200) return { ok: false, message: 'A senha é longa demais.' };
  if (!/[a-zA-Z]/.test(password) || !/[0-9]/.test(password)) {
    return { ok: false, message: 'A senha precisa conter letras e números.' };
  }
  return { ok: true };
}
