import { reminderPlan } from '@gunluk/core';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/*
 * Gentle, local-only reminders in the mascot's voice, never guilt-tripping:
 * one a day for the coming week; if the user stays away, only two soft
 * "missed you" notes (days 10 and 21), then silence. Re-planned on every
 * app open. Letters and goals also get a note on their day.
 */

const LINES = [
  'Bugün nasıl geçti? Tek kelime bile yeter. 🌱',
  'Yapraklarım sayfanı bekliyor. Acele yok, istersen yaz.',
  'Günün küçük bir anını saklamak ister misin?',
  'Buradayım. Bugünü birlikte kapatalım mı?',
  'Bugün seni ne gülümsetti? Merak ettim.',
  'Bir bardak su, bir sayfa günlük. İkisi de iyi gelir. 💧',
  'Sessiz bir gün müydü, dolu dolu mu? Anlatırsan dinlerim.',
];

const MISSED = [
  'Seni özledim. Ne zaman istersen buradayım, acele yok. 🌱',
  'Filizim seni düşünüyor. Tek bir kelime yazsan bile sevinirim.',
];

export function initNotifications(): void {
  if (Platform.OS === 'web') return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') {
    Notifications.setNotificationChannelAsync('default', { name: 'Hatırlatmalar', importance: Notifications.AndroidImportance.DEFAULT }).catch(() => {});
  }
}

export async function askPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const current = await Notifications.getPermissionsAsync();
  if (current.granted) return true;
  return (await Notifications.requestPermissionsAsync()).granted;
}

/** Re-plans the reminders from today (called on each app open and when the time changes). */
export async function scheduleDailyReminders(time: string | null, mascotName: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(
    existing.filter((n) => n.content.data?.kind === 'daily' || n.content.data?.kind === 'missed').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
  );
  let missed = 0;
  for (const slot of reminderPlan(time)) {
    const body = slot.kind === 'daily' ? LINES[slot.at.getDate() % LINES.length] : MISSED[missed++ % MISSED.length];
    await Notifications.scheduleNotificationAsync({
      content: { title: mascotName, body, data: { kind: slot.kind } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: slot.at },
    });
  }
}

/** One-off note on the day a letter opens or a goal is due. */
export async function scheduleOnDate(date: Date, title: string, body: string, kind: 'letter' | 'goal'): Promise<void> {
  if (Platform.OS === 'web' || date <= new Date()) return;
  const at = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 10, 0);
  await Notifications.scheduleNotificationAsync({
    content: { title, body, data: { kind } },
    trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at > new Date() ? at : date },
  }).catch(() => {});
}
