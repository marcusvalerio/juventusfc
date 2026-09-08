type ClassValue = string | number | null | undefined | false | ClassValue[] | Record<string, boolean | undefined | null>;

/** Minimal class combiner — keeps component APIs terse without a runtime dependency. */
export function cn(...inputs: ClassValue[]): string {
  const out: string[] = [];
  const walk = (value: ClassValue) => {
    if (!value) return;
    if (typeof value === 'string' || typeof value === 'number') {
      out.push(String(value));
      return;
    }
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    for (const [key, active] of Object.entries(value)) if (active) out.push(key);
  };
  inputs.forEach(walk);
  return out.join(' ');
}
