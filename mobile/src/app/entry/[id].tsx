import { detectCrisis, MOODS, scenarioEligibility, type CrisisLevel } from '@gunluk/core';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { CrisisCard } from '@/components/CrisisCard';
import { formatDate } from '@/components/EntryCard';
import type { Expression } from '@/components/Mascot';
import { MascotBubble, reportMascotText } from '@/components/MascotBubble';
import { PRIVACY } from '@/components/pickers';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { deleteEntry, entitiesForEntry, getEntry, reactionForEntry, type StoredEntry, type StoredReaction } from '@/lib/db';
import { deletePhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const EXPRESSION: Record<string, Expression> = {
  new_person: 'curious',
  short_streak: 'caring',
  recurring_theme: 'caring',
  crisis: 'caring',
};

export default function EntryScreen() {
  const c = useColors();
  const { id, fresh } = useLocalSearchParams<{ id: string; fresh?: string }>();
  const { settings } = useSettings();
  const [entry, setEntry] = useState<StoredEntry | null>(null);
  const [reaction, setReaction] = useState<StoredReaction | null>(null);
  const [people, setPeople] = useState<{ id: string; name: string; kind: string }[]>([]);
  const [scenario, setScenario] = useState<string | null>(null);
  const [scenarioLoading, setScenarioLoading] = useState(false);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        const e = await getEntry(id);
        setEntry(e);
        if (!e) return;
        setReaction(await reactionForEntry(id));
        setPeople(await entitiesForEntry(id));
      })();
    }, [id]),
  );

  if (!entry) return <Screen><T v="muted">Bu sayfa bulunamadı.</T></Screen>;

  const crisis: CrisisLevel = detectCrisis(entry.text).level;
  const mood = MOODS.find((m) => m.value === entry.mood);
  const canPlay = settings.aiEnabled && scenarioEligibility(entry).eligible;

  const remove = () =>
    Alert.alert('Bu sayfa kalıcı olarak silinsin mi?', 'Sayfa, fotoğrafları ve maskotun ondan hatırladıkları silinir. Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Kalıcı olarak sil', style: 'destructive',
        onPress: async () => {
          deletePhotos(await deleteEntry(entry.id));
          router.back();
        },
      },
    ]);

  const playScenario = async () => {
    setScenarioLoading(true);
    const res = await api.scenario(entry.text);
    setScenarioLoading(false);
    setScenario(res?.text ?? 'Bu sayfa için alternatif bir senaryo kuramadım. Belki başka bir gün?');
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: fresh ? 'Kaydedildi' : '' }} />
      {crisis !== 'none' ? (
        <>
          <CrisisCard level={crisis} />
          <Gap />
        </>
      ) : reaction && fresh ? (
        <>
          <MascotBubble text={reaction.text} expression={EXPRESSION[reaction.kind] ?? 'idle'} name={settings.mascotName} size={64} reportable={settings.aiEnabled} />
          <Gap />
        </>
      ) : null}

      <T v="small">{formatDate(entry.createdAt, true)}</T>
      <Gap h={space.s} />
      <Row>
        {mood ? <Chip label={`${mood.emoji} ${mood.label}`} /> : null}
        {entry.weather ? <Chip label={entry.weather} /> : null}
        {entry.place ? <Chip label={`📍 ${entry.place}`} /> : null}
        <Chip label={`${PRIVACY[entry.privacy].icon} ${PRIVACY[entry.privacy].label}`} />
      </Row>
      <Gap />
      <T v="serif" style={entry.kind === 'one_word' ? { fontSize: 34, lineHeight: 42 } : { fontSize: 18, lineHeight: 29 }}>{entry.text}</T>

      {entry.photos.length > 0 ? (
        <View style={{ gap: space.s, marginTop: space.m }}>
          {entry.photos.map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: 16, backgroundColor: c.sunken }} contentFit="cover" />
          ))}
        </View>
      ) : null}

      {people.length > 0 ? (
        <>
          <Gap h={space.l} />
          <T v="small">Bu sayfada geçenler</T>
          <Gap h={space.xs} />
          <Row>
            {people.map((p) => (
              <Chip key={p.id} label={p.kind === 'place' ? `📍 ${p.name}` : p.name} onPress={() => router.push(`/person/${p.id}`)} />
            ))}
          </Row>
        </>
      ) : null}

      {canPlay ? (
        <>
          <Gap h={space.l} />
          <Card style={{ gap: space.s }}>
            <T v="heading">🎲 Alternatif senaryo</T>
            {scenario ? (
              <>
                <T v="serif">{scenario}</T>
                <Button label="⚑ Bildir" kind="ghost" small style={{ alignSelf: 'flex-end' }} onPress={() => reportMascotText(scenario)} />
              </>
            ) : (
              <>
                <T v="muted">Bu sıradan günde küçük bir seçim farklı olsaydı ne olurdu? Sadece eğlencesine.</T>
                {scenarioLoading ? <ActivityIndicator color={c.accent} /> : <Button label="Hayal et" kind="secondary" small onPress={playScenario} />}
              </>
            )}
          </Card>
        </>
      ) : null}

      <Gap h={space.l} />
      <Row>
        <Button label="Düzenle" kind="secondary" small onPress={() => router.push(`/write?id=${entry.id}`)} />
        <Button label="Sil" kind="danger" small onPress={remove} />
      </Row>
    </Screen>
  );
}
