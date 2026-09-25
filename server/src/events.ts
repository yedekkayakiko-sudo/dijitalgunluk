/*
 * Anonymous, aggregate usage counters. The app sends event names with a few
 * coarse properties (never text, never an identifier); the server only keeps
 * per-day counts, so there is nothing personal to store or leak.
 */

export const EVENT_NAMES = [
  'app_open', 'onboarding_done', 'ai_enabled', 'entry_saved', 'reaction_shown', 'chat_sent', 'scenario_played',
  'letter_written', 'letter_opened', 'goal_created', 'goal_reviewed', 'pet_fed', 'stage_up', 'breathing_done',
  'backup_exported', 'support_shown', 'notification_opened', 'quota_reached',
] as const;

export type EventName = (typeof EVENT_NAMES)[number];

export interface EventRow {
  day: string;
  name: string;
  props: string;
  count: number;
}

export interface EventSink {
  add(rows: Omit<EventRow, 'count'>[]): Promise<void>;
  summary(sinceDay: string): Promise<EventRow[]>;
}

export class MemorySink implements EventSink {
  private counts = new Map<string, number>();
  async add(rows: Omit<EventRow, 'count'>[]) {
    for (const r of rows) {
      const k = JSON.stringify([r.day, r.name, r.props]);
      this.counts.set(k, (this.counts.get(k) ?? 0) + 1);
    }
  }
  async summary(sinceDay: string) {
    return [...this.counts.entries()]
      .map(([k, count]) => {
        const [day, name, props] = JSON.parse(k) as [string, string, string];
        return { day, name, props, count };
      })
      .filter((r) => r.day >= sinceDay)
      .sort((a, b) => a.day.localeCompare(b.day) || a.name.localeCompare(b.name));
  }
}

/** Minimal slice of Cloudflare's D1 API, so this file needs no Workers types. */
export interface D1Like {
  prepare(sql: string): { bind(...values: unknown[]): { run(): Promise<unknown>; all<T>(): Promise<{ results: T[] }> } };
  batch(statements: unknown[]): Promise<unknown>;
}

export class D1Sink implements EventSink {
  constructor(private db: D1Like) {}
  async add(rows: Omit<EventRow, 'count'>[]) {
    if (!rows.length) return;
    const sql =
      'INSERT INTO events (day, name, props, count) VALUES (?, ?, ?, 1) ON CONFLICT(day, name, props) DO UPDATE SET count = count + 1';
    await this.db.batch(rows.map((r) => this.db.prepare(sql).bind(r.day, r.name, r.props)));
  }
  async summary(sinceDay: string) {
    const res = await this.db
      .prepare('SELECT day, name, props, count FROM events WHERE day >= ? ORDER BY day, name')
      .bind(sinceDay)
      .all<EventRow>();
    return res.results;
  }
}

/** Keeps only short, flat, known properties so events cannot carry personal data. */
export function cleanProps(props: Record<string, unknown> | undefined): string {
  if (!props) return '';
  const out: Record<string, string | number | boolean> = {};
  for (const [k, v] of Object.entries(props).slice(0, 4)) {
    if (!/^[a-z_]{1,20}$/.test(k)) continue;
    if (typeof v === 'number' && Number.isFinite(v)) out[k] = Math.round(v);
    else if (typeof v === 'boolean') out[k] = v;
    else if (typeof v === 'string' && /^[a-z0-9_+-]{1,16}$/.test(v)) out[k] = v;
  }
  return JSON.stringify(out, Object.keys(out).sort());
}
