import { DarkTheme, DefaultTheme, Stack, ThemeProvider } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { trackAppOpen } from '@/lib/analytics';
import { initNotifications, scheduleDailyReminders } from '@/lib/notifications';
import { PetProvider } from '@/lib/pet';
import { SettingsProvider, useSettings } from '@/lib/settings';
import { useColors } from '@/theme';

SplashScreen.preventAutoHideAsync();
initNotifications();

function Navigator() {
  const { ready, settings } = useSettings();
  const c = useColors();

  useEffect(() => {
    if (!ready) return;
    SplashScreen.hideAsync();
    if (settings.onboarded) {
      trackAppOpen().catch(() => {});
      scheduleDailyReminders(settings.reminderTime, settings.mascotName).catch(() => {});
    }
  }, [ready, settings.onboarded, settings.reminderTime, settings.mascotName]);

  if (!ready) return null;

  return (
    <Stack screenOptions={{ headerShadowVisible: false, headerStyle: { backgroundColor: c.bg }, headerTintColor: c.text, contentStyle: { backgroundColor: c.bg } }}>
      <Stack.Protected guard={settings.onboarded}>
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="write" options={{ headerShown: false, presentation: 'fullScreenModal', animation: 'slide_from_bottom' }} />
        <Stack.Screen name="entry/[id]" options={{ title: '' }} />
        <Stack.Screen name="person/[id]" options={{ title: '' }} />
        <Stack.Screen name="letters" options={{ title: 'Geleceğe mektuplar' }} />
        <Stack.Screen name="goals" options={{ title: 'Hedef zinciri' }} />
        <Stack.Screen name="memory" options={{ title: 'Beni nasıl tanıyor?' }} />
        <Stack.Screen name="breathe" options={{ title: 'Birlikte nefes', presentation: 'modal' }} />
        <Stack.Screen name="summary" options={{ title: 'Dönem mektubu' }} />
        <Stack.Screen name="backup" options={{ title: 'Yedekleme' }} />
        <Stack.Screen name="settings" options={{ title: 'Ayarlar' }} />
        <Stack.Screen name="consent" options={{ title: 'Yapay zekâ izni' }} />
        <Stack.Screen name="kvkk" options={{ title: 'Aydınlatma metni' }} />
        <Stack.Screen name="privacy" options={{ title: 'Gizlilik ve destek' }} />
      </Stack.Protected>
      <Stack.Protected guard={!settings.onboarded}>
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="kvkk-intro" options={{ title: 'Aydınlatma metni' }} />
      </Stack.Protected>
    </Stack>
  );
}

export default function RootLayout() {
  const scheme = useColorScheme();
  return (
    <ThemeProvider value={scheme === 'dark' ? DarkTheme : DefaultTheme}>
      <SettingsProvider>
        <PetProvider>
          <StatusBar style="auto" />
          <Navigator />
        </PetProvider>
      </SettingsProvider>
    </ThemeProvider>
  );
}
