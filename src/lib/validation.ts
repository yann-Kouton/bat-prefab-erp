import { z } from 'zod';

export type FieldErrors = Record<string, string | undefined>;

/** Valide des valeurs avec un schéma zod et renvoie des erreurs par champ (premier message). */
export function validate<T extends z.ZodType>(schema: T, values: unknown):
  | { ok: true; data: z.infer<T>; errors: FieldErrors }
  | { ok: false; errors: FieldErrors } {
  const result = schema.safeParse(values);
  if (result.success) return { ok: true, data: result.data, errors: {} };
  const errors: FieldErrors = {};
  for (const issue of result.error.issues) {
    const key = issue.path.join('.') || '_';
    if (!errors[key]) errors[key] = issue.message;
  }
  return { ok: false, errors };
}
