/*
 * Free-tier limits for AI features, counted on the device per calendar day.
 * (The server also rate-limits and the API account has a hard monthly cap.)
 */

export const FREE_DAILY = {
  chat: 12,
  scenario: 3,
  letter: 3,
} as const;

export type QuotaKey = keyof typeof FREE_DAILY;

export interface QuotaState {
  day: string;
  used: Partial<Record<QuotaKey, number>>;
}

const today = (now: Date) => `${now.getFullYear()}-${now.getMonth() + 1}-${now.getDate()}`;

export function remaining(state: QuotaState | null, key: QuotaKey, now: Date = new Date()): number {
  const used = state && state.day === today(now) ? state.used[key] ?? 0 : 0;
  return Math.max(0, FREE_DAILY[key] - used);
}

export function consume(state: QuotaState | null, key: QuotaKey, now: Date = new Date()): { allowed: boolean; state: QuotaState } {
  const fresh: QuotaState = state && state.day === today(now) ? state : { day: today(now), used: {} };
  if (remaining(fresh, key, now) <= 0) return { allowed: false, state: fresh };
  return { allowed: true, state: { ...fresh, used: { ...fresh.used, [key]: (fresh.used[key] ?? 0) + 1 } } };
}
