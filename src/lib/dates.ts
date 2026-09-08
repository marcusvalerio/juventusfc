import type { ISODate } from '@/types/domain';

export const MONTHS_SHORT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
export const MONTHS_LONG = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];
export const WEEKDAYS_SHORT = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];

/** Parses YYYY-MM-DD as a *local* date — avoids the UTC off-by-one of `new Date(str)`. */
export function parseDate(value: ISODate): Date {
  const [y, m, d] = value.split('-').map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

export const toISODate = (date: Date): ISODate =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const formatDate = (value?: ISODate) => {
  if (!value) return '—';
  const d = parseDate(value);
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
};

export const formatDateShort = (value: ISODate) => {
  const d = parseDate(value);
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS_SHORT[d.getMonth()]}`;
};

export const formatDateLong = (value: ISODate) => {
  const d = parseDate(value);
  return `${d.getDate()} de ${MONTHS_LONG[d.getMonth()]} de ${d.getFullYear()}`;
};

export const weekdayOf = (value: ISODate) => WEEKDAYS_SHORT[parseDate(value).getDay()];

/** "YYYY-MM" → "Março 2026" */
export const formatMonthRef = (ref: string) => {
  const [y, m] = ref.split('-').map(Number);
  const label = MONTHS_LONG[(m ?? 1) - 1];
  return `${label[0].toUpperCase()}${label.slice(1)} ${y}`;
};

export const monthRefOf = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const daysBetween = (from: ISODate, to: ISODate) =>
  Math.round((parseDate(to).getTime() - parseDate(from).getTime()) / 86_400_000);

export const age = (birthDate?: ISODate) => {
  if (!birthDate) return null;
  const b = parseDate(birthDate);
  const now = TODAY;
  let years = now.getFullYear() - b.getFullYear();
  const monthDiff = now.getMonth() - b.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < b.getDate())) years -= 1;
  return years;
};

/**
 * Single reference "today" for the whole demo, so the mocked calendar,
 * upcoming matches and overdue dues all agree with each other.
 */
export const TODAY = new Date();
export const TODAY_ISO = toISODate(TODAY);

export const isPast = (value: ISODate) => parseDate(value).getTime() < TODAY.setHours(0, 0, 0, 0);
export const isToday = (value: ISODate) => value === TODAY_ISO;

/** Relative label used by activity feeds: "há 2 h", "ontem". */
export function relativeTime(iso: string) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const minutes = Math.round(diffMs / 60_000);
  if (minutes < 1) return 'agora';
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `há ${hours} h`;
  const days = Math.round(hours / 24);
  if (days === 1) return 'ontem';
  if (days < 30) return `há ${days} dias`;
  const months = Math.round(days / 30);
  return `há ${months} ${months === 1 ? 'mês' : 'meses'}`;
}

/** Calendar grid (6 weeks) for a given month, Sunday-first. */
export function monthGrid(year: number, month: number): Date[] {
  const first = new Date(year, month, 1);
  const start = new Date(first);
  start.setDate(first.getDate() - first.getDay());
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    return d;
  });
}
