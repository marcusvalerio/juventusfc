const BRL = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  minimumFractionDigits: 2,
});

const BRL_COMPACT = new Intl.NumberFormat('pt-BR', {
  style: 'currency',
  currency: 'BRL',
  notation: 'compact',
  maximumFractionDigits: 1,
});

const NUMBER = new Intl.NumberFormat('pt-BR');

export const currency = (value: number) => BRL.format(value);
export const currencyCompact = (value: number) => BRL_COMPACT.format(value);
export const number = (value: number) => NUMBER.format(value);

export const percent = (value: number, digits = 0) =>
  `${value.toLocaleString('pt-BR', { minimumFractionDigits: digits, maximumFractionDigits: digits })}%`;

/** Signed currency, used wherever a value can move the balance either way. */
export const signedCurrency = (value: number) =>
  `${value > 0 ? '+' : value < 0 ? '−' : ''}${currency(Math.abs(value))}`;

/** "Rafael Corsini" → "RC"; particles like "de"/"da" are ignored. */
export const initials = (name: string) => {
  const particles = new Set(['de', 'da', 'do', 'das', 'dos', 'e']);
  const parts = name.trim().split(/\s+/).filter((p) => p && !particles.has(p.toLowerCase()));
  if (parts.length === 0) return '?';
  const first = parts[0][0];
  const last = parts.length > 1 ? parts[parts.length - 1][0] : '';
  return (first + last).toUpperCase();
};

export const firstName = (name: string) => name.trim().split(/\s+/)[0];

export const truncate = (value: string, max: number) =>
  value.length <= max ? value : `${value.slice(0, max - 1).trimEnd()}…`;
