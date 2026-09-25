import {
  dailyPrompt, detectCrisis, extractThemes, goalPhase, growthFor, isOpenable, onThisDay, pickMemoryCallback, rhythmMessage, writingRhythm,
  type FutureLetter, type Goal, type GoalCheckin, type MemoryCallback, type Stage,
} from '@gunluk/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { EntryCard } from '@/components/EntryCard';
import { PetMascot } from '@/components/PetMascot';
import { canShare, ShareMascot } from '@/components/ShareMascot';
import { StageUp } from '@/components/StageUp';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { allEntryDates, kvGet, kvSet, listCheckins, listEntities, listEntries, listGoals, listLetters, loadDraft, type StoredEntry } from '@/lib/db';
import { reindexPeopleOnce } from '@/lib/mascot';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { serif, space, useColors } from '@/theme';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
  return name ? `${part}, ${name}` : part;
}

/**
 * "Hatırlıyor musun?": at most one memory a week, from about a month, three
 * months, six months or a year ago. The same one stays for the whole day.
 */
async function chooseCallback(all: StoredEntry[]): Promise<MemoryCallback<StoredEntry> | null> {
  const today = new Date().toDateString();
  const saved = JSON.parse((await kvGet('memory-callback')) ?? 'null') as { id: string; day: string; at: number } | null;
  const eligible = all.filter((e) => e.privacy !== 'private' && detectCrisis(e.text).level === 'none');
  // Same day: show the memory already chosen this morning.
  if (saved?.day === today) return pickMemoryCallback(eligible.filter((e) => e.id === saved.id), new Date(saved.at));
  if (saved && Date.now() - saved.at < 7 * 86_400_000) return null;
  const pick = pickMemoryCallback(eligible);
  if (pick) {
    await kvSet('memory-callback', JSON.stringify({ id: pick.entry.id, day: today, at: Date.now() }));
    track('memory_callback');
  }
  return pick;
}

export default function Home() {
  const c = useColors();
  const { settings } = useSettings();
  const { pet, info, refresh, feedDrop } = usePet();
  const [recent, setRecent] = useState<StoredEntry[]>([]);
  const [memories, setMemories] = useState<{ yearsAgo: number; entries: StoredEntry[] }[]>([]);
  const [rhythm, setRhythm] = useState<ReturnType<typeof writingRhythm> | null>(null);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [goals, setGoals] = useState<{ goal: Goal; phase: ReturnType<typeof goalPhase> }[]>([]);
  const [prompt, setPrompt] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [awake, setAwake] = useState(false);
  const [feeding, setFeeding] = useState(0);
  const [grewTo, setGrewTo] = useState<Stage | null>(null);
  const [callback, setCallback] = useState<MemoryCallback<StoredEntry> | null>(null);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLine(null);
      (async () => {
        await reindexPeopleOnce().catch(() => {});
        await refresh();
        const [latest, dates, allLetters, draft, all, goalList, checkins, people] = await Promise.all([
          listEntries({ limit: 5 }), allEntryDates(), listLetters(), loadDraft(), listEntries(), listGoals(), listCheckins(), listEntities('person'),
        ]);
        if (!alive) return;
        const active = goalList.map((g) => ({ goal: g, phase: goalPhase(g, checkins as GoalCheckin[]) })).filter((g) => g.phase !== 'reviewed');
        setRecent(latest);
        const exact = onThisDay(all);
        setMemories(exact);
        setCallback(exact.length ? null : await chooseCallback(all));
        setRhythm(writingRhythm(dates));
        setLetters(allLetters.filter((l) => isOpenable(l) && !l.openedAt));
        setGoals(active);
        setHasDraft(!!draft && !draft.entryId && draft.text.trim().length > 0);
        setPrompt(
          dailyPrompt({
            themes: [...new Set(latest.filter((e) => e.privacy === 'ai_full').flatMap((e) => extractThemes(e.text)))],
            people: people.slice(0, 3).map((p) => p.name),
            goal: active[0]?.goal.text ?? null,
          }),
        );
      })();
      return () => {
        alive = false;
      };
    }, [refresh]),
  );

  const sleeping = !awake && (rhythm?.daysSinceLast ?? 0) >= 3;
  const defaultLine = info.age?.birthdayToday
    ? `Bugün benim doğum günüm! 🎂 ${info.age.label}. İyi ki varsın.`
    : sleeping
      ? 'Zzz… Seni bekliyordum. Bana dokunursan uyanırım!'
      : callback
        ? `Hatırlıyor musun? ${callback.label} şöyle yazmıştın: “${callback.snippet}”`
        : rhythm
          ? rhythmMessage(rhythm)
          : 'Bugün nasıl geçti?';

  const feed = async () => {
    setAwake(true);
    setFeeding((f) => f + 1);
    const grew = await feedDrop();
    track('pet_fed');
    if (grew) {
      const next = growthFor(pet.xp + 1).stage;
      setTimeout(() => setGrewTo(next), 700);
      track('stage_up', { stage: next.id });
    } else if (pet.drops - 1 <= 0) {
      setLine('Mmm, doydum! Yarın yine yazarsan yine su veririz. 💧');
    } else {
      setLine(['Oh, ne güzel su!', 'Yapraklarım parladı!', 'Bir damla daha? 🌱', 'Büyüdüğümü hissediyorum!'][Math.floor(Math.random() * 4)]);
    }
  };

  const due = goals.find((g) => g.phase === 'due');
  const checkin = goals.find((g) => g.phase === 'checkin');

  return (
    <Screen>
      <T v="title">{greeting(settings.userName)}</T>
      <Gap h={space.m} />

      <Card style={{ alignItems: 'center', gap: space.s, paddingTop: space.l }}>
        <Pressable
          disabled={!!line || !callback || sleeping}
          onPress={() => callback && router.push(`/entry/${callback.entry.id}`)}
          style={{ backgroundColor: c.sunken, borderRadius: 16, paddingVertical: space.s, paddingHorizontal: space.m, maxWidth: '92%' }}>
          <T v="body" style={{ textAlign: 'center' }}>{line ?? defaultLine}</T>
          {!line && callback && !sleeping ? <T v="small" style={{ textAlign: 'center', marginTop: 2 }}>Sayfayı açmak için dokun</T> : null}
        </Pressable>
        <PetMascot
          size={160}
          stage={info.index}
          aged={info.aged}
          baseExpression={sleeping ? 'sleepy' : info.age?.birthdayToday ? 'happy' : 'idle'}
          feeding={feeding}
          onSay={(l) => {
            setAwake(true);
            setLine(sleeping ? 'Günaydııın! Seni özlemiştim. 🌱' : l);
          }}
        />
        <T v="heading">{settings.mascotName}</T>
        <T v="small">
          {info.stage.name}
          {info.age ? ` · ${info.age.label}` : ''}
        </T>
        {info.next ? (
          <View style={{ alignSelf: 'stretch', gap: 4 }}>
            <View style={{ height: 8, borderRadius: 4, backgroundColor: c.sunken, overflow: 'hidden' }}>
              <View style={{ width: `${Math.round(info.progress * 100)}%`, height: 8, backgroundColor: '#86BD6F' }} />
            </View>
            <T v="small" style={{ textAlign: 'center', fontSize: 12 }}>{info.next.name} olmaya {info.next.minXp - pet.xp} damla kaldı</T>
          </View>
        ) : null}
        <Row style={{ alignSelf: 'stretch', flexWrap: 'nowrap' }}>
          <Button
            label={pet.drops > 0 ? `💧 Su ver (${pet.drops})` : '💧 Yazdıkça damla kazanırsın'}
            kind={pet.drops > 0 ? 'primary' : 'secondary'}
            small
            disabled={pet.drops <= 0}
            onPress={feed}
            style={{ flex: 1 }}
          />
          <Button label="🫁" kind="secondary" small onPress={() => router.push('/breathe')} />
          {canShare ? <Button label="📸" kind="secondary" small onPress={() => setSharing(true)} /> : null}
        </Row>
      </Card>

      <Gap />
      <Pressable onPress={() => router.push(`/write?prompt=${encodeURIComponent(prompt)}`)} accessibilityRole="button">
        <Card style={{ gap: 6, backgroundColor: c.accentSoft, borderColor: c.accentSoft }}>
          <T v="small" style={{ fontWeight: '700' }}>Günün sorusu</T>
          <T v="serif" style={{ fontFamily: serif, fontSize: 19 }}>{prompt}</T>
        </Card>
      </Pressable>
      <Gap h={space.s} />
      <Button label={hasDraft ? 'Yarım kalan sayfana devam et' : 'Bugünü yaz'} onPress={() => router.push('/write')} />
      <Button label="Enerjin yok mu? Tek kelimeyle anlat" kind="ghost" small onPress={() => router.push('/write?mode=word')} style={{ marginTop: 4 }} />

      {due || checkin ? (
        <>
          <Gap />
          <Card onPress={() => router.push('/goals')} style={{ gap: 4 }}>
            <T v="heading">{due ? '🎯 Hedefinin günü geldi' : '🎯 Hedefin nasıl gidiyor?'}</T>
            <T v="muted">“{(due ?? checkin)!.goal.text}”</T>
          </Card>
        </>
      ) : null}

      {letters.length > 0 ? (
        <>
          <Gap />
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
            {memories.map((g) => g.entries.slice(0, 1).map((e) => <EntryCard key={e.id} entry={e} label={`${g.yearsAgo} yıl önce bugün`} />))}
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
        <T v="muted">Henüz bir sayfa yok. İlk sayfan kısa olabilir; tek bir cümle bile yeter, ve ilk damlanı kazanırsın. 💧</T>
      ) : (
        <View style={{ gap: space.s }}>
          {recent.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </View>
      )}

      <StageUp stage={grewTo} index={info.index} aged={info.aged} onClose={() => setGrewTo(null)} />
      <ShareMascot
        visible={sharing}
        headline={info.age && info.age.days > 0 ? `${settings.mascotName} ${info.age.label}! 🌱` : `Tanışın: ${settings.mascotName} 🌱`}
        onClose={() => setSharing(false)}
      />
    </Screen>
  );
}
