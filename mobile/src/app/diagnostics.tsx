import Constants from 'expo-constants';
import * as Notifications from 'expo-notifications';
import { Accelerometer } from 'expo-sensors';
import { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Share, View } from 'react-native';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { aiReady, api } from '@/lib/api';
import { diagnose, kvGet } from '@/lib/db';
import { hasValidConsent, useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

/*
 * System check: a quick way to see (and send the developer) what works on
 * this phone. It never includes diary content.
 */

type Check = { label: string; ok: boolean | null; detail: string };

export default function Diagnostics() {
  const c = useColors();
  const { settings } = useSettings();
  const [checks, setChecks] = useState<Check[]>([]);
  const [running, setRunning] = useState(true);
  const [aiTest, setAiTest] = useState<string | null>(null);

  const collect = useCallback(async (): Promise<Check[]> => {
    const out: Check[] = [];
    const safe = async (label: string, fn: () => Promise<Omit<Check, 'label'>>) => {
      try {
        out.push({ label, ...(await fn()) });
      } catch (e) {
        out.push({ label, ok: false, detail: e instanceof Error ? e.message : 'hata' });
      }
    };
    await safe('Veritabanı şifrelemesi', async () => {
      const d = await diagnose();
      return Platform.OS === 'web'
        ? { ok: null, detail: 'Web önizlemesinde şifreleme yok (telefonda olur).' }
        : { ok: !!d.cipher && d.keyPresent, detail: d.cipher ? `SQLCipher ${d.cipher}, anahtar güvenli depoda. ${d.entries} sayfa.` : 'SQLCipher etkin değil!' };
    });
    await safe('Bildirimler', async () => {
      if (Platform.OS === 'web') return { ok: null, detail: 'Web önizlemesinde yok.' };
      const perm = await Notifications.getPermissionsAsync();
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      return { ok: perm.granted || !settings.reminderTime, detail: `İzin: ${perm.granted ? 'var' : 'yok'} · Hatırlatma: ${settings.reminderTime ?? 'kapalı'} · Planlı: ${scheduled.length}` };
    });
    await safe('Hareket sensörü (sallama)', async () => {
      if (Platform.OS === 'web') return { ok: null, detail: 'Web önizlemesinde yok.' };
      const ok = await Accelerometer.isAvailableAsync();
      return { ok, detail: ok ? 'Çalışıyor' : 'Bu cihazda yok' };
    });
    await safe('Sunucu', async () => {
      if (!settings.serverUrl) return { ok: null, detail: 'Sunucu adresi girilmemiş.' };
      const h = await api.health(settings.serverUrl);
      return h ? { ok: h.ai, detail: `${settings.serverUrl} · yapay zekâ ${h.ai ? 'hazır' : 'anahtarsız'} · anlamsal arama ${h.embeddings ? 'açık' : 'kapalı'}` } : { ok: false, detail: `${settings.serverUrl} adresine ulaşılamadı.` };
    });
    await safe('Yapay zekâ izni', async () => ({
      ok: aiReady(settings) ? true : null,
      detail: `Anahtar: ${settings.aiEnabled ? 'açık' : 'kapalı'} · KVKK onayı: ${hasValidConsent(settings) ? 'var' : 'yok'}`,
    }));
    await safe('Yedek', async () => {
      const last = await kvGet('last-backup');
      return { ok: last ? true : null, detail: last ? `Son yedek: ${new Date(last).toLocaleDateString('tr-TR')}` : 'Henüz yedek alınmadı.' };
    });
    return out;
  }, [settings]);

  useEffect(() => {
    collect().then((out) => {
      setChecks(out);
      setRunning(false);
    });
  }, [collect]);

  const run = () => {
    setRunning(true);
    collect().then((out) => {
      setChecks(out);
      setRunning(false);
    });
  };

  const testAi = async () => {
    setAiTest('Bağlanıyor…');
    const started = Date.now();
    let first: number | null = null;
    const res = await api.chat(
      { messages: [{ role: 'user', content: 'Bu bir bağlantı testi. Bana tek cümleyle merhaba de.' }], notes: [], goals: [], pages: [], longHeavy: false },
      (soFar) => {
        first ??= Date.now() - started;
        setAiTest(soFar);
      },
    );
    const total = Date.now() - started;
    setAiTest(res ? `${res.reply}\n\n(ilk kelime ${first ?? '-'} ms, tamamı ${total} ms, kaynak: ${res.source})` : 'Yanıt alınamadı. Sunucu adresini ve yapay zekâ iznini kontrol et.');
  };

  const report = () => {
    const lines = [
      `Pusula Günlük ${Constants.expoConfig?.version ?? '?'} · ${Platform.OS} ${Platform.Version}`,
      ...checks.map((k) => `${k.ok === true ? '✅' : k.ok === false ? '❌' : '➖'} ${k.label}: ${k.detail}`),
      aiTest ? `Yapay zekâ testi: ${aiTest.split('\n').pop()}` : '',
    ].filter(Boolean);
    Share.share({ message: lines.join('\n') });
  };

  return (
    <Screen>
      <T v="muted">Uygulamanın bu telefonda nasıl çalıştığını gösterir. Rapor hiçbir sayfa içeriği içermez.</T>
      <Gap />
      {running ? <ActivityIndicator color={c.accent} /> : null}
      <View style={{ gap: space.s }}>
        {checks.map((k) => (
          <Card key={k.label} style={{ gap: 2 }}>
            <T v="heading">
              {k.ok === true ? '✅' : k.ok === false ? '❌' : '➖'} {k.label}
            </T>
            <T v="small">{k.detail}</T>
          </Card>
        ))}
      </View>
      <Gap />
      {aiReady(settings) ? (
        <Card style={{ gap: space.s }}>
          <T v="heading">Yapay zekâ canlı testi</T>
          {aiTest ? <T v="body">{aiTest}</T> : <T v="small">Kısa bir mesaj gönderip yanıt süresini ölçer (1 sohbet hakkı kullanır).</T>}
          <Button label="Test et" kind="secondary" small onPress={testAi} />
        </Card>
      ) : null}
      <Gap />
      <Row>
        <Button label="Yeniden kontrol et" kind="secondary" onPress={run} />
        <Button label="Raporu paylaş" onPress={report} />
      </Row>
    </Screen>
  );
}
