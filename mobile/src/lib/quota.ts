import { consume as consumeQuota, remaining as remainingQuota, type QuotaKey, type QuotaState } from '@gunluk/core';
import { kvGet, kvSet } from './db';

/* Free daily limits for AI features, counted on the device. */

async function load(): Promise<QuotaState | null> {
  const raw = await kvGet('quota');
  return raw ? (JSON.parse(raw) as QuotaState) : null;
}

export async function takeQuota(key: QuotaKey): Promise<boolean> {
  const r = consumeQuota(await load(), key);
  await kvSet('quota', JSON.stringify(r.state));
  return r.allowed;
}

export async function quotaLeft(key: QuotaKey): Promise<number> {
  return remainingQuota(await load(), key);
}
