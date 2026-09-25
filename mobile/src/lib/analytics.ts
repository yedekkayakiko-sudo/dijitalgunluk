import { dayKey } from '@gunluk/core';
import { api } from './api';
import { kvGet, kvSet } from './db';
import { readSettings } from './settings';

/*
 * Opt-in, anonymous usage counts. Events carry a name and at most a few coarse
 * properties; they are queued on the device and sent without any identifier.
 */

export type EventName =
  | 'app_open' | 'onboarding_done' | 'ai_enabled' | 'entry_saved' | 'reaction_shown' | 'chat_sent' | 'scenario_played'
  | 'letter_written' | 'letter_opened' | 'goal_created' | 'goal_reviewed' | 'pet_fed' | 'stage_up' | 'breathing_done'
  | 'backup_exported' | 'support_shown' | 'notification_opened' | 'quota_reached' | 'mascot_shared' | 'memory_callback';

type Queued = { name: EventName; day: string; props?: Record<string, string | number | boolean> };

export async function track(name: EventName, props?: Record<string, string | number | boolean>): Promise<void> {
  try {
    if (!(await readSettings()).analytics) return;
    const queue = JSON.parse((await kvGet('event-queue')) ?? '[]') as Queued[];
    queue.push({ name, day: dayKey(new Date()), props });
    await kvSet('event-queue', JSON.stringify(queue.slice(-300)));
  } catch {
    // analytics must never break the app
  }
}

export async function flushEvents(): Promise<void> {
  try {
    const queue = JSON.parse((await kvGet('event-queue')) ?? '[]') as Queued[];
    if (!queue.length) return;
    if (await api.events(queue.slice(0, 100))) await kvSet('event-queue', JSON.stringify(queue.slice(100)));
  } catch {
    // try again next launch
  }
}

/** Days since install, bucketed so retention can be read from plain counts (D1, D7, D30). */
export async function trackAppOpen(): Promise<void> {
  let installed = await kvGet('installed-at');
  if (!installed) {
    installed = new Date().toISOString();
    await kvSet('installed-at', installed);
  }
  const days = Math.floor((Date.now() - new Date(installed).getTime()) / 86_400_000);
  const d = days <= 3 ? days : days <= 6 ? 4 : days === 7 ? 7 : days <= 13 ? 8 : days <= 29 ? 14 : 30;
  const last = await kvGet('last-open-day');
  const today = dayKey(new Date());
  if (last === today) return;
  await kvSet('last-open-day', today);
  await track('app_open', { d });
  await flushEvents();
}
