/*
 * Server-side daily ceilings, so a copied app key cannot drain the AI budget.
 * Identifiers are hashed with a salt that changes every day: counts can be
 * enforced today without being able to link anyone across days.
 */

export interface QuotaStore {
  /** Increments the counter and returns the new value. */
  hit(day: string, key: string): Promise<number>;
}

export class MemoryQuotaStore implements QuotaStore {
  private counts = new Map<string, number>();
  async hit(day: string, key: string) {
    const k = `${day}|${key}`;
    const n = (this.counts.get(k) ?? 0) + 1;
    if (this.counts.size > 100_000) this.counts.clear();
    this.counts.set(k, n);
    return n;
  }
}

interface D1Stmt {
  bind(...values: unknown[]): { first<T>(): Promise<T | null>; run(): Promise<unknown> };
}
export interface D1QuotaDb {
  prepare(sql: string): D1Stmt;
}

export class D1QuotaStore implements QuotaStore {
  constructor(private db: D1QuotaDb) {}
  async hit(day: string, key: string) {
    const row = await this.db
      .prepare('INSERT INTO quotas (day, key, count) VALUES (?, ?, 1) ON CONFLICT(day, key) DO UPDATE SET count = count + 1 RETURNING count')
      .bind(day, key)
      .first<{ count: number }>();
    // Keep the table tiny: forget everything older than two days, now and then.
    if (Math.random() < 0.02) await this.db.prepare('DELETE FROM quotas WHERE day < ?').bind(shiftDay(day, -2)).run();
    return row?.count ?? 1;
  }
}

function shiftDay(day: string, delta: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export async function dailyHash(value: string, day: string, salt: string): Promise<string> {
  const bytes = new TextEncoder().encode(`${day}|${salt}|${value}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest).slice(0, 12), (b) => b.toString(16).padStart(2, '0')).join('');
}
