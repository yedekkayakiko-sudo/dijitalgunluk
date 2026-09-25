import { DarkTheme, DefaultTheme, Stack, ThemeProvider, type ErrorBoundaryProps } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Platform, Share, Text, useColorScheme, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Button } from '@/components/ui';
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
        <Stack.Screen name="diagnostics" options={{ title: 'Sistem kontrolü' }} />
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

/** Shown instead of a blank screen if something crashes. Diary data is untouched. */
export function ErrorBoundary({ error, retry }: ErrorBoundaryProps) {
  const c = useColors();
  return (
    <View style={{ flex: 1, backgroundColor: c.bg, alignItems: 'center', justifyContent: 'center', padding: 24, gap: 16 }}>
      <Mascot size={120} expression="dizzy" breathing={false} dressed={false} />
      <Text style={{ color: c.text, fontSize: 22, fontWeight: '700', textAlign: 'center' }}>Başım döndü…</Text>
      <Text style={{ color: c.muted, fontSize: 15, textAlign: 'center' }}>
        Bir şeyler ters gitti ama sayfaların güvende. Tekrar deneyebilir ya da hatayı geliştiriciye gönderebilirsin.
      </Text>
      <Button label="Tekrar dene" onPress={retry} />
      <Button
        label="Hata raporunu paylaş"
        kind="ghost"
        small
        onPress={() => Share.share({ message: `Pusula Günlük hata (${Platform.OS} ${Platform.Version}): ${error.name}: ${error.message}\n${(error.stack ?? '').split('\n').slice(0, 6).join('\n')}` })}
      />
    </View>
  );
}
