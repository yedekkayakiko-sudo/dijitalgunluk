import type { Entry, Mood } from './types';

const DAY = 86_400_000;

/** Local calendar day key, e.g. "2026-09-25". */
export function dayKey(d: Date | string): string {
  const x = typeof d === 'string' ? new Date(d) : d;
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${x.getFullYear()}-${m}-${day}`;
}

export interface OnThisDayGroup<E> {
  yearsAgo: number;
  entries: E[];
}

/** "Bu tarihte geçen yıl ne yazmıştın?" — entries from the same calendar day in earlier years. */
export function onThisDay<E extends Pick<Entry, 'createdAt'>>(entries: E[], now: Date = new Date()): OnThisDayGroup<E>[] {
  const groups = new Map<number, E[]>();
  for (const e of entries) {
    const d = new Date(e.createdAt);
    if (d.getMonth() !== now.getMonth() || d.getDate() !== now.getDate()) continue;
    const yearsAgo = now.getFullYear() - d.getFullYear();
    if (yearsAgo < 1) continue;
    groups.set(yearsAgo, [...(groups.get(yearsAgo) ?? []), e]);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]).map(([yearsAgo, es]) => ({ yearsAgo, entries: es }));
}

export interface WritingRhythm {
  wroteToday: boolean;
  /** Consecutive days with a page, ending today or yesterday. */
  currentRun: number;
  /** Days since the last page (0 = today). null if nothing written yet. */
  daysSinceLast: number | null;
  daysWrittenLast30: number;
}

export function writingRhythm(dates: string[], now: Date = new Date()): WritingRhythm {
  const days = new Set(dates.map(dayKey));
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const keyAt = (offset: number) => dayKey(new Date(today.getTime() - offset * DAY + DAY / 2));

  let last: number | null = null;
  for (let i = 0; i < 3650 && last === null; i++) if (days.has(keyAt(i))) last = i;
  if (days.size === 0) last = null;

  let run = 0;
  if (last !== null && last <= 1) for (let i = last; days.has(keyAt(i)); i++) run++;

  let last30 = 0;
  for (let i = 0; i < 30; i++) if (days.has(keyAt(i))) last30++;

  return { wroteToday: last === 0, currentRun: run, daysSinceLast: last, daysWrittenLast30: last30 };
}

/**
 * Streak copy that never punishes: missed days are "boşluk" (a pause), not a loss.
 */
export function rhythmMessage(r: WritingRhythm): string {
  if (r.daysSinceLast === null) return 'İlk sayfa her zaman en özelidir. Hazır olduğunda buradayım.';
  if (r.wroteToday && r.currentRun >= 3) return `${r.currentRun} gündür kendine zaman ayırıyorsun. Bu güzel.`;
  if (r.wroteToday) return 'Bugünün sayfası yazıldı.';
  if (r.daysSinceLast === 1) return 'Bugün nasıl geçti? Tek bir kelime bile yeter.';
  if (r.daysSinceLast < 7) return `Son sayfadan bu yana ${r.daysSinceLast} gün geçmiş. Boşluklar da hikâyenin bir parçası.`;
  return 'Bir süredir sessizdi, ama sayfalar seni bekliyor. Kaldığın yerden devam etmek için mükemmel bir gün gerekmiyor.';
}

export interface MoodPoint {
  key: string;
  average: number;
  count: number;
}

/** Average mood per day or ISO-like week (weeks start Monday). Visualisation only, never interpreted. */
export function moodSeries(entries: Pick<Entry, 'createdAt' | 'mood'>[], bucket: 'day' | 'week' = 'day'): MoodPoint[] {
  const acc = new Map<string, { sum: number; count: number }>();
  for (const e of entries) {
    if (e.mood == null) continue;
    const d = new Date(e.createdAt);
    let key = dayKey(d);
    if (bucket === 'week') {
      const monday = new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7));
      key = dayKey(monday);
    }
    const a = acc.get(key) ?? { sum: 0, count: 0 };
    a.sum += e.mood;
    a.count += 1;
    acc.set(key, a);
  }
  return [...acc.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, { sum, count }]) => ({ key, average: sum / count, count }));
}

export const MOODS: { value: Mood; emoji: string; label: string }[] = [
  { value: 1, emoji: '😞', label: 'Zor' },
  { value: 2, emoji: '😕', label: 'Durgun' },
  { value: 3, emoji: '😐', label: 'Normal' },
  { value: 4, emoji: '🙂', label: 'İyi' },
  { value: 5, emoji: '😄', label: 'Harika' },
];

export interface ReminderSlot {
  at: Date;
  kind: 'daily' | 'missed';
}

/**
 * Local reminder plan, recomputed every time the app opens: one gentle
 * reminder a day for the next week, then silence, except two "missed you"
 * notes on days 10 and 21 of an absence. Never more.
 */
export function reminderPlan(time: string | null, now: Date = new Date()): ReminderSlot[] {
  if (!time) return [];
  const [h, m] = time.split(':').map(Number);
  const at = (days: number) => new Date(now.getFullYear(), now.getMonth(), now.getDate() + days, h, m);
  const slots: ReminderSlot[] = [];
  for (let i = 0; i < 7; i++) if (at(i) > now) slots.push({ at: at(i), kind: 'daily' });
  slots.push({ at: at(10), kind: 'missed' }, { at: at(21), kind: 'missed' });
  return slots;
}

export interface MemoryCallback<E> {
  entry: E;
  /** "1 ay önce", "1 yıl önce"… */
  label: string;
  snippet: string;
}

const CALLBACK_AGES: [number, string][] = [
  [365, '1 yıl önce'],
  [180, '6 ay önce'],
  [90, '3 ay önce'],
  [30, '1 ay önce'],
];

/**
 * "Hatırlıyor musun?": picks a page from about a month, three months, six
 * months or a year ago (±3 days), preferring warm, longer pages. Pages the
 * caller passes must already exclude private and crisis entries.
 */
export function pickMemoryCallback<E extends Pick<Entry, 'createdAt' | 'text' | 'mood' | 'kind'>>(entries: E[], now: Date = new Date()): MemoryCallback<E> | null {
  const DAY = 86_400_000;
  for (const [days, label] of CALLBACK_AGES) {
    const center = now.getTime() - days * DAY;
    const candidates = entries
      .filter((e) => e.kind === 'entry' && Math.abs(new Date(e.createdAt).getTime() - center) <= 3 * DAY && e.text.split(/\s+/).length >= 8)
      .filter((e) => e.mood == null || e.mood >= 3)
      .sort((a, b) => b.text.length - a.text.length);
    const pick = candidates[0];
    if (pick) {
      const first = pick.text.split(/[.!?…]\s/)[0] ?? pick.text;
      const snippet = first.length > 110 ? `${first.slice(0, 107).trimEnd()}…` : first;
      return { entry: pick, label, snippet };
    }
  }
  return null;
}
