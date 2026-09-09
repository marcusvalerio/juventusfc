import { z } from 'zod';
import { badRequest } from './errors';

/**
 * Parses a JSON body against a schema and turns failures into the shared error
 * envelope with per-field details. The frontend validates too, but only this
 * result is trusted.
 */
export async function parseBody<T extends z.ZodTypeAny>(
  request: Request,
  schema: T,
): Promise<z.infer<T>> {
  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    throw badRequest('Corpo da requisição inválido.');
  }

  const result = schema.safeParse(raw);
  if (!result.success) {
    const details: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.') || '_';
      if (!details[path]) details[path] = issue.message;
    }
    throw badRequest('Dados inválidos.', details);
  }
  return result.data;
}

/** Trims strings and turns empty ones into null, so blank inputs never become "". */
export const optionalText = (max = 500) =>
  z
    .string()
    .trim()
    .max(max)
    .transform((value) => (value.length === 0 ? null : value))
    .nullable()
    .optional()
    .transform((value) => value ?? null);

export const requiredText = (label: string, max = 200) =>
  z.string({ message: `${label} é obrigatório.` }).trim().min(1, `${label} é obrigatório.`).max(max);

export const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use uma data no formato AAAA-MM-DD.');

export const optionalIsoDate = z
  .union([isoDate, z.literal('')])
  .optional()
  .transform((value) => (value ? value : null));

export const monthRef = z.string().regex(/^\d{4}-\d{2}$/, 'Use o formato AAAA-MM.');

export const timeOfDay = z.string().regex(/^\d{2}:\d{2}$/, 'Use um horário no formato HH:MM.');

export const money = z.coerce.number().min(0, 'Informe um valor maior ou igual a zero.');

export const positiveInt = z.coerce.number().int().min(0);

export { z };
