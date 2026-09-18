import { z } from 'zod';
const DraftSchema = z.object({ choices: z.record(z.uuid(), z.uuid()), idempotency_key: z.uuid() });
export type Draft = z.infer<typeof DraftSchema>;
export function readDraft(key: string): Draft {
  try {
    const raw = JSON.parse(localStorage.getItem(key) ?? 'null');
    const parsed = DraftSchema.safeParse(raw);
    if (parsed.success) return parsed.data;
  } catch {
    /* unavailable or invalid storage is safely discarded */
  }
  return { choices: {}, idempotency_key: crypto.randomUUID() };
}
export function saveDraft(key: string, draft: Draft) {
  try {
    localStorage.setItem(key, JSON.stringify(draft));
  } catch {
    /* voting still works with in-memory draft */
  }
}
