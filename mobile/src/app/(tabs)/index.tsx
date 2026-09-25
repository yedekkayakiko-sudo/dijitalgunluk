import { isOpenable, onThisDay, rhythmMessage, writingRhythm, type FutureLetter } from '@gunluk/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { EntryCard } from '@/components/EntryCard';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { allEntryDates, listEntries, listLetters, loadDraft, type StoredEntry } from '@/lib/db';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
  return name ? `${part}, ${name}` : part;
}

export default function Home() {
  const { settings } = useSettings();
  const [recent, setRecent] = useState<StoredEntry[]>([]);
  const [memories, setMemories] = useState<{ yearsAgo: number; entries: StoredEntry[] }[]>([]);
  const [message, setMessage] = useState('');
  const [growth, setGrowth] = useState(0);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [hasDraft, setHasDraft] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      (async () => {
        const [entries, dates, allLetters, draft] = await Promise.all([listEntries({ limit: 5 }), allEntryDates(), listLetters(), loadDraft()]);
        const all = await listEntries();
        if (!alive) return;
        setRecent(entries);
        setMemories(onThisDay(all));
        setMessage(rhythmMessage(writingRhythm(dates)));
        setGrowth(Math.min(1, dates.length / 100));
        setLetters(allLetters.filter((l) => isOpenable(l) && !l.openedAt));
        setHasDraft(!!draft && !draft.entryId && draft.text.trim().length > 0);
      })();
      return () => {
        alive = false;
      };
    }, []),
  );

  return (
    <Screen>
      <T v="title">{greeting(settings.userName)}</T>
      <Gap h={space.l} />
      <MascotBubble text={message || 'Bugün nasıl geçti?'} name={settings.mascotName} expression={recent.length ? 'happy' : 'idle'} growth={growth} size={84} />
      <Gap />
      <Button label={hasDraft ? 'Yarım kalan sayfana devam et' : 'Bugünü yaz'} onPress={() => router.push('/write')} />
      <Gap h={space.s} />
      <Button label="Bugünü tek kelimeyle anlat" kind="secondary" onPress={() => router.push('/write?mode=word')} />

      {letters.length > 0 ? (
        <>
          <Gap h={space.l} />
          <Card onPress={() => router.push('/letters')} style={{ gap: 4 }}>
            <T v="heading">✉️ Geçmişten bir mektubun var</T>
            <T v="muted">Kendine yazdığın {letters.length === 1 ? 'mektubun' : `${letters.length} mektubun`} açılma zamanı geldi.</T>
          </Card>
        </>
      ) : null}

      {memories.length > 0 ? (
        <>
          <Gap h={space.l} />
          <T v="heading">Bu tarihte</T>
          <Gap h={space.s} />
          <View style={{ gap: space.s }}>
            {memories.map((g) =>
              g.entries.slice(0, 1).map((e) => <EntryCard key={e.id} entry={e} label={`${g.yearsAgo} yıl önce bugün`} />),
            )}
          </View>
        </>
      ) : null}

      <Gap h={space.l} />
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="heading">Son sayfalar</T>
        {recent.length > 0 ? <Button label="Tümü" kind="ghost" small onPress={() => router.push('/timeline')} /> : null}
      </Row>
      <Gap h={space.s} />
      {recent.length === 0 ? (
        <T v="muted">Henüz bir sayfa yok. İlk sayfan kısa olabilir; tek bir cümle bile yeter.</T>
      ) : (
        <View style={{ gap: space.s }}>
          {recent.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </View>
      )}
    </Screen>
  );
}
