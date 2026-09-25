import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/*
 * Gentle, local-only reminders: one a day at the chosen time, in the mascot's
 * voice, never guilt-tripping. Letters and goals also get a note on their day.
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

/** Schedules the next 7 daily reminders with varied lines (re-run on each app open). */
export async function scheduleDailyReminders(time: string | null, mascotName: string): Promise<void> {
  if (Platform.OS === 'web') return;
  const existing = await Notifications.getAllScheduledNotificationsAsync();
  await Promise.all(existing.filter((n) => n.content.data?.kind === 'daily').map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)));
  if (!time) return;
  const [h, m] = time.split(':').map(Number);
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, h, m);
    if (at <= now) continue;
    await Notifications.scheduleNotificationAsync({
      content: { title: mascotName, body: LINES[(at.getDate() + i) % LINES.length], data: { kind: 'daily' } },
      trigger: { type: Notifications.SchedulableTriggerInputTypes.DATE, date: at },
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
