const ALPHABET = '0123456789abcdefghijklmnopqrstuvwxyz';

/**
 * Opaque, server-generated identifier: `<prefix>_<22 random chars>`.
 * Clients never choose ids, so a request cannot claim another club's row.
 */
export function newId(prefix: string): string {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  let out = '';
  for (const byte of bytes) out += ALPHABET[byte % ALPHABET.length];
  return `${prefix}_${out}`;
}

export const nowIso = () => new Date().toISOString();
