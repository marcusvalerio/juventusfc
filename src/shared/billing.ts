/**
 * Billing rules shared by the Worker (generation) and the SPA (the form).
 *
 * Both sides must land on the same due date for the same person and month:
 * a charge raised by hand and one produced by "Gerar mês" are the same
 * charge, so they cannot disagree about when it falls due.
 */

/** How many days the month actually has. `month` is 1-indexed. */
export function lastDayOfMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one, leap years included.
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/**
 * The due date of a monthly charge: the person's billing day inside the
 * reference month, pulled back to the last day that month actually has.
 * A person billed on day 31 falls due on 28/02 (29 on a leap year) and on
 * 30/04, never on a date that does not exist.
 *
 * Returns an empty string when the reference month is not a real `AAAA-MM`;
 * the caller decides what that means for it.
 */
export function dueDateFor(referenceMonth: string, dueDay: number): string {
  const [year, month] = referenceMonth.split('-').map(Number);
  if (!year || !month || month < 1 || month > 12) return '';
  const day = Math.min(Math.max(Math.trunc(dueDay) || 1, 1), lastDayOfMonth(year, month));
  return `${referenceMonth}-${String(day).padStart(2, '0')}`;
}
