import { TODAY, toISODate } from '@/lib/dates';
import type { ISODate, ISODateTime } from '@/types/domain';

/**
 * Mock data is anchored to the current date so the demo always looks live:
 * upcoming matches stay upcoming and overdue dues stay overdue.
 */
export const dayOffset = (days: number): ISODate => {
  const d = new Date(TODAY);
  d.setDate(d.getDate() + days);
  return toISODate(d);
};

export const hourOffset = (hours: number): ISODateTime => {
  const d = new Date(TODAY);
  d.setHours(d.getHours() - hours);
  return d.toISOString();
};

export const monthOffset = (months: number) => {
  const d = new Date(TODAY.getFullYear(), TODAY.getMonth() + months, 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const STAMP = new Date(TODAY.getFullYear(), 0, 15).toISOString();

/** Adds the audit stamps every entity carries, without repeating them in the seeds. */
export const stamped = <T extends { id: string }>(records: T[]) =>
  records.map((record) => ({ ...record, createdAt: STAMP, updatedAt: STAMP }));

export const seasonYear = String(TODAY.getFullYear());
