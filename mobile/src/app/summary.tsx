import { detectCrisis, periodStats, templateLetter } from '@gunluk/core';
import { useEffect, useState } from 'react';
import { ActivityIndicator } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { reportMascotText } from '@/components/MascotBubble';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { entityNamesForEntries, listEntries } from '@/lib/db';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

type Period = 'week' | 'month' | 'last_month';

function range(p: Period): { from: Date; to: Date; label: string } {
  const now = new Date();
  if (p === 'week') return { from: new Date(now.getTime() - 7 * 86_400_000), to: now, label: 'Bu hafta' };
  if (p === 'month') return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: now, label: 'Bu ay' };
  return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1), label: 'Geçen ay' };
}

export default function Summary() {
  const c = useColors();
  const { settings } = useSettings();
  const [period, setPeriod] = useState<Period>('week');
  const [letter, setLetter] = useState('');
  const [loading, setLoading] = useState(false);
  const [aiUsed, setAiUsed] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setAiUsed(false);
      const r = range(period);
      const entries = await listEntries({ from: r.from.toISOString(), to: r.to.toISOString() });
      const names = await entityNamesForEntries(entries.map((e) => e.id));
      const stats = periodStats(entries, entries.map((e) => names[e.id] ?? []));
      const fallback = templateLetter(stats, r.label, settings.tone, settings.userName);
      if (!alive) return;
      setLetter(fallback);
      setLoading(false);
      if (!settings.aiEnabled || entries.length === 0) return;

      setLoading(true);
      // Only full-analysis pages are shared for the letter.
      const excerpts = entries
        .filter((e) => e.privacy === 'ai_full' && detectCrisis(e.text).level === 'none')
        .slice(0, 12)
        .map((e) => ({ date: new Date(e.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' }), text: e.text }));
      const res = excerpts.length
        ? await api.letter({ periodLabel: r.label, topPeople: stats.topPeople.map((p) => p.name), topThemes: stats.topThemes.map((t) => t.label), excerpts, fallback })
        : null;
      if (!alive) return;
      if (res?.text) {
        setLetter(res.text);
        setAiUsed(true);
      }
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, [period, settings.aiEnabled, settings.tone, settings.userName]);

  return (
    <Screen>
      <Row>
        <Chip label="Bu hafta" selected={period === 'week'} onPress={() => setPeriod('week')} />
        <Chip label="Bu ay" selected={period === 'month'} onPress={() => setPeriod('month')} />
        <Chip label="Geçen ay" selected={period === 'last_month'} onPress={() => setPeriod('last_month')} />
      </Row>
      <Gap />
      <Card style={{ gap: space.m, backgroundColor: c.sunken }}>
        <Mascot size={64} expression="happy" />
        {loading && !letter ? <ActivityIndicator color={c.accent} /> : <T v="serif">{letter}</T>}
        <T v="small" style={{ textAlign: 'right' }}>— {settings.mascotName}</T>
        {aiUsed ? <Button label="⚑ Bildir" kind="ghost" small style={{ alignSelf: 'flex-end' }} onPress={() => reportMascotText(letter)} /> : null}
      </Card>
      {loading && letter ? <T v="small" style={{ marginTop: space.s }}>{settings.mascotName} mektubu kendi sözcükleriyle yazıyor…</T> : null}
      {!settings.aiEnabled ? (
        <>
          <Gap />
          <T v="small">Yapay zekâ kapalı olduğu için bu mektup cihazında, hazır kalıplarla yazıldı.</T>
        </>
      ) : aiUsed ? (
        <>
          <Gap />
          <T v="small">Bu mektup sadece “tam analiz” izni verdiğin sayfalardan yazıldı.</T>
        </>
      ) : null}
    </Screen>
  );
}
