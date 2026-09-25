import { detectCrisis, keepsakeFor, MOODS, scenarioEligibility, type CrisisLevel } from '@gunluk/core';
import { Image } from 'expo-image';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, View } from 'react-native';
import { formatDate } from '@/components/EntryCard';
import type { Expression } from '@/components/Mascot';
import { MascotBubble, reportMascotText } from '@/components/MascotBubble';
import { PRIVACY } from '@/components/pickers';
import { SupportStrip } from '@/components/SupportStrip';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { aiReady, api } from '@/lib/api';
import { deleteEntry, entitiesForEntry, getEntry, reactionForEntry, type StoredEntry, type StoredReaction } from '@/lib/db';
import { noteTexts } from '@/lib/memory';
import { awardBond } from '@/lib/pet';
import { deletePhotos } from '@/lib/photos';
import { takeQuota } from '@/lib/quota';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const EXPRESSION: Record<string, Expression> = {
  new_person: 'curious',
  short_streak: 'caring',
  recurring_theme: 'caring',
  support: 'caring',
  crisis: 'caring',
  celebrate: 'happy',
};

export default function EntryScreen() {
  const c = useColors();
  const { id, fresh, gained } = useLocalSearchParams<{ id: string; fresh?: string; gained?: string }>();
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
        // Going back to an old page is part of knowing yourself.
        if (!fresh && Date.now() - new Date(e.createdAt).getTime() > 7 * 86_400_000) awardBond(['memory']).catch(() => {});
        setReaction(await reactionForEntry(id));
        setPeople(await entitiesForEntry(id));
      })();
    }, [id, fresh]),
  );

  if (!entry) return <Screen><T v="muted">Bu sayfa bulunamadı.</T></Screen>;

  const crisis: CrisisLevel = detectCrisis(entry.text).level;
  const mood = MOODS.find((m) => m.value === entry.mood);
  const eligibility = scenarioEligibility(entry);
  const canPlay = aiReady(settings) && eligibility.eligible;
  const heartache = eligibility.eligible && eligibility.mode === 'heartache';
  const showReaction = !!reaction && (!!fresh || reaction.kind === 'support' || reaction.kind === 'crisis');
  const earned = Number(gained ?? 0);
  const keepsake = keepsakeFor(entry);

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

  const play = async () => {
    if (!(await takeQuota('scenario'))) {
      setScenario('Bugünlük hayal gücüm tükendi. 🌙 Yarın yine oynayalım mı?');
      return;
    }
    setScenarioLoading(true);
    const res = await api.scenario(entry.text, await noteTexts());
    setScenarioLoading(false);
    setScenario(res?.text ?? 'Bu sayfa için bir senaryo kuramadım. Belki başka bir gün?');
    if (res) track('scenario_played', { mode: res.mode });
  };

  const askPlay = () =>
    heartache
      ? Alert.alert(
          'Farklı bir yol düşünelim mi?',
          'Bu oyun zor bir konuya dokunabilir. Amacı pişmanlığı büyütmek değil, hafifletmek: öbür yolu dürüstçe konuşup bugün elinde olana bakacağız. Hazır mısın?',
          [{ text: 'Şimdi değil', style: 'cancel' }, { text: 'Hazırım', onPress: play }],
        )
      : play();

  return (
    <Screen>
      <Stack.Screen options={{ title: fresh ? 'Kaydedildi' : '' }} />
      {showReaction ? (
        <>
          <MascotBubble text={reaction!.text} expression={EXPRESSION[reaction!.kind] ?? 'idle'} name={settings.mascotName} size={64} reportable={aiReady(settings)} />
          {crisis === 'acute' ? (
            <>
              <Gap h={space.s} />
              <SupportStrip />
            </>
          ) : null}
          {reaction!.kind === 'support' || reaction!.kind === 'crisis' ? (
            <>
              <Gap h={space.s} />
              <Row>
                <Button label="Konuşalım" small onPress={() => router.push('/chat')} />
                <Button label="Birlikte nefes" kind="secondary" small onPress={() => router.push('/breathe')} />
              </Row>
            </>
          ) : null}
          <Gap />
        </>
      ) : crisis === 'acute' ? (
        <>
          <SupportStrip />
          <Gap />
        </>
      ) : null}

      {fresh ? (
        <>
          <Card style={{ backgroundColor: c.accentSoft, borderColor: c.accentSoft, flexDirection: 'row', alignItems: 'center', gap: space.m }}>
            <T v="body" style={{ fontSize: 30, lineHeight: 36 }}>{keepsake.glyph}</T>
            <View style={{ flex: 1 }}>
              <T v="heading">Rafına yeni bir anı eklendi</T>
              <T v="small">{keepsake.label}{earned > 0 ? ` · bağınız +${earned}` : ''}</T>
            </View>
          </Card>
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
            <T v="heading">{heartache ? 'Ya başka türlü olsaydı?' : 'Alternatif senaryo'}</T>
            {scenario ? (
              <>
                <T v="serif">{scenario}</T>
                <Button label="⚑ Bildir" kind="ghost" small style={{ alignSelf: 'flex-end' }} onPress={() => reportMascotText(scenario)} />
              </>
            ) : (
              <>
                <T v="muted">
                  {heartache
                    ? 'Öbür yolu birlikte, dürüstçe yürüyelim: neler olabilirdi, bedelleri ne olurdu, ve bugün elinde ne var.'
                    : 'Bu günde küçük bir seçim farklı olsaydı ne olurdu? Sadece eğlencesine.'}
                </T>
                {scenarioLoading ? <ActivityIndicator color={c.accent} /> : <Button label={heartache ? 'Düşünelim' : 'Hayal et'} kind="secondary" small onPress={askPlay} />}
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
