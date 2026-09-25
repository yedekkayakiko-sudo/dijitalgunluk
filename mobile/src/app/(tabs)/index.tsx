import {
  dailyPrompt, detectCrisis, extractThemes, goalPhase, insightsFor, isOpenable, keepsakeFor, localDay, onThisDay, pickMemoryCallback,
  rhythmMessage, writingRhythm, type FutureLetter, type Goal, type GoalCheckin, type Insight, type MemoryCallback,
} from '@gunluk/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { EntryCard } from '@/components/EntryCard';
import { Icon } from '@/components/Icon';
import { PetMascot } from '@/components/PetMascot';
import { canShare, ShareMascot } from '@/components/ShareMascot';
import { Button, Card, Gap, Label, Progress, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { allEntryDates, kvGet, kvSet, listCheckins, listEntities, listEntries, listGoals, listLetters, loadDraft, type StoredEntry } from '@/lib/db';
import { reindexPeopleOnce } from '@/lib/mascot';
import { awardBond, usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { serif, space, useColors } from '@/theme';

function greeting(name: string): string {
  const h = new Date().getHours();
  const part = h < 5 ? 'İyi geceler' : h < 12 ? 'Günaydın' : h < 18 ? 'Merhaba' : 'İyi akşamlar';
  return name ? `${part}, ${name}` : part;
}

const isEvening = () => {
  const h = new Date().getHours();
  return h >= 21 || h < 4;
};

/**
 * "Hatırlıyor musun?": at most one memory a week, from about a month, three
 * months, six months or a year ago. The same one stays for the whole day.
 */
async function chooseCallback(all: StoredEntry[]): Promise<MemoryCallback<StoredEntry> | null> {
  const today = new Date().toDateString();
  const saved = JSON.parse((await kvGet('memory-callback')) ?? 'null') as { id: string; day: string; at: number } | null;
  const eligible = all.filter((e) => e.privacy !== 'private' && detectCrisis(e.text).level === 'none');
  if (saved?.day === today) return pickMemoryCallback(eligible.filter((e) => e.id === saved.id), new Date(saved.at));
  if (saved && Date.now() - saved.at < 7 * 86_400_000) return null;
  const pick = pickMemoryCallback(eligible);
  if (pick) {
    await kvSet('memory-callback', JSON.stringify({ id: pick.entry.id, day: today, at: Date.now() }));
    track('memory_callback');
  }
  return pick;
}

const GOODNIGHT = ['İyi geceler. Bugün de buradaydın, bu yeter.', 'Uyku vakti. Yarın yine anlatırsın.', 'Işıkları kapatıyorum. İyi ki yazdın.'];

export default function Home() {
  const c = useColors();
  const { settings } = useSettings();
  const { info, traits, refresh } = usePet();
  const [recent, setRecent] = useState<StoredEntry[]>([]);
  const [shelf, setShelf] = useState<StoredEntry[]>([]);
  const [memories, setMemories] = useState<{ yearsAgo: number; entries: StoredEntry[] }[]>([]);
  const [rhythm, setRhythm] = useState<ReturnType<typeof writingRhythm> | null>(null);
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [goals, setGoals] = useState<{ goal: Goal; phase: ReturnType<typeof goalPhase> }[]>([]);
  const [insight, setInsight] = useState<{ card: Insight; fresh: boolean; pages: number } | null>(null);
  const [prompt, setPrompt] = useState('');
  const [hasDraft, setHasDraft] = useState(false);
  const [line, setLine] = useState<string | null>(null);
  const [awake, setAwake] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [callback, setCallback] = useState<MemoryCallback<StoredEntry> | null>(null);
  const [sharing, setSharing] = useState(false);

  useFocusEffect(
    useCallback(() => {
      let alive = true;
      setLine(null);
      (async () => {
        await reindexPeopleOnce().catch(() => {});
        await refresh();
        const [all, dates, allLetters, draft, goalList, checkins, people, night, seenInsights] = await Promise.all([
          listEntries(), allEntryDates(), listLetters(), loadDraft(), listGoals(), listCheckins(), listEntities('person'), kvGet('goodnight-day'), kvGet('insights-seen'),
        ]);
        if (!alive) return;
        const active = goalList.map((g) => ({ goal: g, phase: goalPhase(g, checkins as GoalCheckin[]) })).filter((g) => g.phase !== 'reviewed');
        const latest = all.slice(0, 3);
        setRecent(latest);
        setShelf(all.slice(0, 8));
        const exact = onThisDay(all);
        setMemories(exact);
        setCallback(exact.length ? null : await chooseCallback(all));
        setRhythm(writingRhythm(dates));
        setLetters(allLetters.filter((l) => isOpenable(l) && !l.openedAt));
        setGoals(active);
        setHasDraft(!!draft && !draft.entryId && draft.text.trim().length > 0);
        setTucked(night === localDay(new Date()) && isEvening());
        // The newest observation the user hasn't opened yet, or the next one to unlock.
        const cards = insightsFor(all, people);
        const seen = new Set<string>(JSON.parse(seenInsights ?? '[]'));
        const fresh = cards.find((x) => x.unlocked && !seen.has(x.id));
        const next = cards.find((x) => !x.unlocked);
        const last = [...cards].reverse().find((x) => x.unlocked);
        setInsight(fresh ? { card: fresh, fresh: true, pages: all.length } : next ? { card: next, fresh: false, pages: all.length } : last ? { card: last, fresh: false, pages: all.length } : null);
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

  const sleeping = (!awake && (rhythm?.daysSinceLast ?? 0) >= 3) || tucked;
  const defaultLine = tucked
    ? 'Zzz… Yarın görüşürüz.'
    : info.age?.birthdayToday
      ? `Bugün benim doğum günüm! ${info.age.label}. İyi ki varsın.`
      : sleeping
        ? 'Zzz… Seni bekliyordum. Bana dokunursan uyanırım.'
        : callback
          ? `Hatırlıyor musun? ${callback.label} şöyle yazmıştın: “${callback.snippet}”`
          : rhythm
            ? rhythmMessage(rhythm)
            : 'Bugün nasıl geçti?';

  const goodnight = async () => {
    await kvSet('goodnight-day', localDay(new Date()));
    await awardBond(['goodnight']);
    track('goodnight');
    setTucked(true);
    setLine(GOODNIGHT[Math.floor(Math.random() * GOODNIGHT.length)]);
  };

  const due = goals.find((g) => g.phase === 'due');
  const checkin = goals.find((g) => g.phase === 'checkin');
  const trait = traits[0];

  return (
    <Screen>
      <T v="small">{new Date().toLocaleDateString('tr-TR', { weekday: 'long', day: 'numeric', month: 'long' })}</T>
      <T v="title">{greeting(settings.userName)}</T>
      <Gap h={space.m} />

      <Card style={{ alignItems: 'center', gap: space.s, paddingTop: space.m, backgroundColor: c.card }}>
        <Pressable
          disabled={!!line || !callback || sleeping}
          onPress={() => callback && router.push(`/entry/${callback.entry.id}`)}
          style={{ backgroundColor: c.sunken, borderRadius: 14, paddingVertical: space.s, paddingHorizontal: space.m, maxWidth: '94%' }}>
          <T v="body" style={{ textAlign: 'center' }}>{line ?? defaultLine}</T>
          {!line && callback && !sleeping ? <T v="small" style={{ textAlign: 'center', marginTop: 2 }}>Sayfayı açmak için dokun</T> : null}
        </Pressable>
        <PetMascot
          size={170}
          look={info.look}
          baseExpression={sleeping ? 'sleepy' : info.age?.birthdayToday ? 'happy' : 'idle'}
          onSay={(l) => {
            setAwake(true);
            setLine(tucked ? 'Hı? Uyuyordum… Tamam, bir kez daha sarıl, sonra uyuyorum.' : sleeping ? 'Günaydııın! Seni özlemiştim.' : l);
          }}
        />
        <Pressable onPress={() => router.push('/bond')} style={{ alignSelf: 'stretch', gap: 6 }} accessibilityRole="button" accessibilityLabel="Maskotun gelişimi">
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="heading">{settings.mascotName}</T>
            <T v="small">Seviye {info.level} · {info.chapter.name}</T>
          </Row>
          <Progress value={info.progress} />
          <Row style={{ justifyContent: 'space-between' }}>
            <T v="small">{trait ? `${trait.glyph} ${trait.label}` : info.age ? info.age.label : 'Yeni tanışıyoruz'}</T>
            <T v="small">{info.maxed ? 'Can dostu' : `Sonraki seviyeye ${info.toNext}`}</T>
          </Row>
        </Pressable>
        <Row style={{ alignSelf: 'stretch', flexWrap: 'nowrap', marginTop: 4 }}>
          <Button label="Birlikte nefes" kind="secondary" small onPress={() => router.push('/breathe')} style={{ flex: 1 }} />
          {isEvening() && !tucked ? <Button label="İyi geceler de" kind="secondary" small onPress={goodnight} style={{ flex: 1 }} /> : null}
          {canShare ? (
            <Pressable onPress={() => setSharing(true)} accessibilityRole="button" accessibilityLabel="Paylaş" style={{ backgroundColor: c.accentSoft, borderRadius: 10, padding: 9 }}>
              <Icon name="share" color={c.text} size={20} />
            </Pressable>
          ) : null}
        </Row>
      </Card>

      <Gap />
      <Button label={hasDraft ? 'Yarım kalan sayfana devam et' : 'Bugünü yaz'} onPress={() => router.push('/write')} />
      <Button label="Enerjin yok mu? Tek kelimeyle anlat" kind="ghost" small onPress={() => router.push('/write?mode=word')} style={{ marginTop: 2 }} />

      <Gap h={space.s} />
      <Pressable onPress={() => router.push(`/write?prompt=${encodeURIComponent(prompt)}`)} accessibilityRole="button">
        <Card style={{ gap: 6, backgroundColor: c.warm, borderColor: c.warm }}>
          <Label>Günün sorusu</Label>
          <T v="serif" style={{ fontFamily: serif, fontSize: 19, lineHeight: 27 }}>{prompt}</T>
        </Card>
      </Pressable>

      {due || checkin ? (
        <>
          <Gap h={space.s} />
          <Card onPress={() => router.push('/goals')} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <Icon name="target" color={c.accent} />
            <View style={{ flex: 1 }}>
              <T v="heading">{due ? 'Hedefinin günü geldi' : 'Hedefin nasıl gidiyor?'}</T>
              <T v="muted" numberOfLines={2}>“{(due ?? checkin)!.goal.text}”</T>
            </View>
          </Card>
        </>
      ) : null}

      {letters.length > 0 ? (
        <>
          <Gap h={space.s} />
          <Card onPress={() => router.push('/letters')} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <Icon name="letter" color={c.accent} />
            <View style={{ flex: 1 }}>
              <T v="heading">Geçmişten bir mektubun var</T>
              <T v="muted">Kendine yazdığın {letters.length === 1 ? 'mektubun' : `${letters.length} mektubun`} açılma zamanı geldi.</T>
            </View>
          </Card>
        </>
      ) : null}

      <Gap h={space.l} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Anı rafı</Label>
        {shelf.length > 0 ? <Button label="Tümü" kind="ghost" small onPress={() => router.push('/shelf')} /> : null}
      </Row>
      <Gap h={space.xs} />
      <Row gap={space.s} style={{ flexWrap: 'nowrap' }}>
        {Array.from({ length: 6 }, (_, i) => {
          const e = shelf[i];
          const k = e ? keepsakeFor(e) : null;
          return (
            <Pressable
              key={e?.id ?? `empty-${i}`}
              disabled={!e}
              onPress={() => e && router.push(`/entry/${e.id}`)}
              accessibilityLabel={k ? k.label : 'Boş raf'}
              style={{
                flex: 1, aspectRatio: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                backgroundColor: e ? c.card : 'transparent', borderWidth: 1, borderColor: c.border, borderStyle: e ? 'solid' : 'dashed',
              }}>
              {k ? <T v="body" style={{ fontSize: 24, lineHeight: 30 }}>{k.glyph}</T> : null}
            </Pressable>
          );
        })}
      </Row>
      {shelf.length === 0 ? <T v="small" style={{ marginTop: 6 }}>Her sayfan bu rafa küçük bir anı bırakır: kahve içtiğin gün bir fincan, denize gittiğin gün bir dalga.</T> : null}

      {insight ? (
        <>
          <Gap h={space.l} />
          <Label>Seni tanıdıkça</Label>
          <Gap h={space.s} />
          <Card onPress={() => router.push('/bond')} style={{ gap: 6, borderColor: insight.fresh ? c.accent : c.border }}>
            <Row style={{ justifyContent: 'space-between' }}>
              <T v="heading">{insight.card.glyph} {insight.card.title}</T>
              {insight.fresh ? <T v="small" style={{ color: c.accent, fontWeight: '700' }}>Yeni</T> : null}
            </Row>
            {insight.card.unlocked ? (
              <T v="muted" numberOfLines={insight.fresh ? 1 : 3}>{insight.fresh ? 'Senin hakkında yeni bir şey fark ettim. Okumak için dokun.' : insight.card.text}</T>
            ) : insight.pages >= insight.card.unlockAt ? (
              <T v="muted">Bir şeyler fark etmeye başladım ama emin olmak için biraz daha yazmanı bekliyorum.</T>
            ) : (
              <>
                <T v="muted">{insight.card.unlockAt - insight.pages} sayfa sonra açılacak.</T>
                <Progress value={insight.pages / insight.card.unlockAt} height={4} />
              </>
            )}
          </Card>
        </>
      ) : null}

      {memories.length > 0 ? (
        <>
          <Gap h={space.l} />
          <Label>Bu tarihte</Label>
          <Gap h={space.s} />
          <View style={{ gap: space.s }}>
            {memories.map((g) => g.entries.slice(0, 1).map((e) => <EntryCard key={e.id} entry={e} label={`${g.yearsAgo} yıl önce bugün`} />))}
          </View>
        </>
      ) : null}

      <Gap h={space.l} />
      <Row style={{ justifyContent: 'space-between' }}>
        <Label>Son sayfalar</Label>
        {recent.length > 0 ? <Button label="Tümü" kind="ghost" small onPress={() => router.push('/timeline')} /> : null}
      </Row>
      <Gap h={space.xs} />
      {recent.length === 0 ? (
        <T v="muted">Henüz bir sayfa yok. İlk sayfan kısa olabilir; tek bir cümle bile yeter.</T>
      ) : (
        <View style={{ gap: space.s }}>
          {recent.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </View>
      )}

      <ShareMascot
        visible={sharing}
        headline={info.age && info.age.days > 0 ? `${settings.mascotName} ${info.age.label}!` : `Tanışın: ${settings.mascotName}`}
        onClose={() => setSharing(false)}
      />
    </Screen>
  );
}
