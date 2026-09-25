import {
  dueDateFor, GOAL_PRESETS, goalChain, goalPhase, REVIEW_OPTIONS, searchEntries, timeUntil,
  type Goal, type GoalCheckin, type GoalStatus,
} from '@gunluk/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { formatDate } from '@/components/EntryCard';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { addCheckin, addGoal, deleteGoal, listCheckins, listEntries, listGoals, reviewGoal } from '@/lib/db';
import { scheduleOnDate } from '@/lib/notifications';
import { awardBond } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { serif, space, useColors } from '@/theme';

const STATUS_ICON: Record<GoalStatus, string> = { active: '🎯', done: '✅', partial: '🌗', missed: '🌱' };
const FEELINGS: { value: GoalCheckin['feeling']; label: string; reply: string }[] = [
  { value: 'good', label: '🙂 İyi gidiyor', reply: 'Harika! Ritmini bulmuşsun, böyle devam.' },
  { value: 'ok', label: '😐 İdare eder', reply: 'İdare etmek de ilerlemek demek. Küçük bir adım yeter.' },
  { value: 'hard', label: '😣 Zorlanıyorum', reply: 'Zorlanman çok normal. Hedefi küçültmek pes etmek değil; bu hafta için daha kolay bir adım seçelim mi?' },
];

export default function Goals() {
  const c = useColors();
  const { settings } = useSettings();
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<GoalCheckin[]>([]);
  const [related, setRelated] = useState<Record<string, number>>({});
  const [composing, setComposing] = useState<{ parentId: string | null } | null>(null);
  const [text, setText] = useState('');
  const [why, setWhy] = useState('');
  const [days, setDays] = useState(30);
  const [reflection, setReflection] = useState('');
  const [said, setSaid] = useState<string | null>(null);

  const load = useCallback(() => {
    (async () => {
      const [gs, cs, entries] = await Promise.all([listGoals(), listCheckins(), listEntries({ excludePrivate: true })]);
      setGoals(gs);
      setCheckins(cs);
      const counts: Record<string, number> = {};
      for (const g of gs.filter((x) => x.status === 'active')) {
        const inRange = entries.filter((e) => e.createdAt >= g.createdAt);
        counts[g.id] = searchEntries(g.text, inRange, { limit: 50 }).filter((h) => h.score > 0.3).length;
      }
      setRelated(counts);
    })();
  }, []);
  useFocusEffect(load);

  const active = goals.filter((g) => g.status === 'active');
  const lastReviewed = [...goals].reverse().find((g) => g.status !== 'active' && !goals.some((x) => x.parentId === g.id));
  const chainEnd = active[0] ?? lastReviewed;
  const chain = chainEnd ? goalChain(goals, chainEnd.id) : [];

  const create = async () => {
    if (!text.trim()) return;
    const due = dueDateFor(days);
    await addGoal({ text: text.trim(), why: why.trim() || null, dueAt: due.toISOString(), parentId: composing?.parentId ?? null });
    await scheduleOnDate(due, `${settings.mascotName}: hedefinin günü geldi 🎯`, `“${text.trim()}” nasıl geçti? Birlikte bakalım.`, 'goal');
    track('goal_created', { days, chained: !!composing?.parentId });
    await awardBond(['goal_set']);
    setComposing(null);
    setText('');
    setWhy('');
    setSaid('Hedefin mühürlendi. Arada bir nasıl gittiğini soracağım; zamanı gelince birlikte bakarız.');
    load();
  };

  const checkIn = async (g: Goal, f: (typeof FEELINGS)[number]) => {
    await addCheckin({ goalId: g.id, at: new Date().toISOString(), feeling: f.value, note: null });
    await awardBond(['goal_checkin']);
    setSaid(f.reply);
    load();
  };

  const review = async (g: Goal, option: (typeof REVIEW_OPTIONS)[number]) => {
    await reviewGoal(g.id, option.status, reflection.trim() || null);
    await awardBond(['goal_review']);
    track('goal_reviewed', { status: option.status });
    setReflection('');
    setSaid(option.reply);
    load();
  };

  const remove = (g: Goal) =>
    Alert.alert('Hedef silinsin mi?', g.text, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteGoal(g.id); load(); } },
    ]);

  const input = { backgroundColor: c.bg, borderRadius: 12, padding: 12, color: c.text, fontSize: 16 } as const;

  return (
    <Screen>
      <MascotBubble
        text={said ?? (active.length ? 'Hedeflerin burada. Zorlanırsan söyle, birlikte küçültürüz.' : 'Bir ay sonra nerede olmak istersin? Küçük ve somut bir hedef koy; zamanı gelince birlikte bakalım.')}
        size={60}
      />
      <Gap />

      {active.map((g) => {
        const phase = goalPhase(g, checkins);
        return (
          <Card key={g.id} style={{ gap: space.s, marginBottom: space.m }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T v="small">{phase === 'due' ? 'Zamanı geldi!' : `${timeUntil(g.dueAt)} kaldı`}</T>
              <Button label="Sil" kind="ghost" small onPress={() => remove(g)} />
            </Row>
            <T v="serif" style={{ fontFamily: serif, fontSize: 21 }}>{g.text}</T>
            {g.why ? <T v="muted">Neden: {g.why}</T> : null}
            {related[g.id] ? <T v="small">Bu hedef koyulduğundan beri {related[g.id]} sayfanda buna dair bir şeyler var.</T> : null}

            {phase === 'checkin' ? (
              <>
                <T v="heading">Nasıl gidiyor?</T>
                <Row>
                  {FEELINGS.map((f) => (
                    <Chip key={f.value} label={f.label} onPress={() => checkIn(g, f)} />
                  ))}
                </Row>
              </>
            ) : null}

            {phase === 'due' ? (
              <>
                <T v="heading">Nasıl oldu?</T>
                <TextInput value={reflection} onChangeText={setReflection} multiline placeholder="Bu hedef sana ne öğretti? (isteğe bağlı)" placeholderTextColor={c.muted} style={[input, { minHeight: 70 }]} />
                <Row>
                  {REVIEW_OPTIONS.map((o) => (
                    <Button key={o.status} label={o.label} kind={o.status === 'done' ? 'primary' : 'secondary'} small onPress={() => review(g, o)} />
                  ))}
                </Row>
              </>
            ) : null}
          </Card>
        );
      })}

      {composing ? (
        <Card style={{ gap: space.s }}>
          <T v="heading">{composing.parentId ? 'Zincire yeni halka' : 'Yeni hedef'}</T>
          <TextInput value={text} onChangeText={setText} autoFocus placeholder="Ör. Haftada 3 kez 20 dakika yürümek" placeholderTextColor={c.muted} style={input} maxLength={140} />
          <TextInput value={why} onChangeText={setWhy} placeholder="Bu hedef senin için neden önemli? (isteğe bağlı)" placeholderTextColor={c.muted} style={input} maxLength={200} />
          <T v="small">Ne zaman bakalım?</T>
          <Row>
            {GOAL_PRESETS.map((p) => (
              <Chip key={p.days} label={p.label} selected={days === p.days} onPress={() => setDays(p.days)} />
            ))}
          </Row>
          <Row>
            <Button label="Mühürle" onPress={create} disabled={!text.trim()} />
            <Button label="Vazgeç" kind="ghost" onPress={() => setComposing(null)} />
          </Row>
        </Card>
      ) : active.length < 3 ? (
        <Row>
          {lastReviewed && !active.length ? (
            <Button label="🔗 Zinciri sürdür" onPress={() => setComposing({ parentId: lastReviewed.id })} />
          ) : null}
          <Button label="+ Yeni hedef" kind={lastReviewed && !active.length ? 'secondary' : 'primary'} onPress={() => setComposing({ parentId: null })} />
        </Row>
      ) : null}

      {chain.length > 1 || (chain.length === 1 && chain[0].status !== 'active') ? (
        <>
          <Gap h={space.l} />
          <T v="heading">Zincirin</T>
          <Gap h={space.s} />
          <View style={{ borderLeftWidth: 3, borderColor: '#86BD6F', marginLeft: 10, paddingLeft: space.m, gap: space.m }}>
            {chain.map((g) => (
              <View key={g.id} style={{ gap: 2 }}>
                <T v="body">
                  {STATUS_ICON[g.status]} {g.text}
                </T>
                <T v="small">{formatDate(g.createdAt)}</T>
                {g.reflection ? <T v="muted">“{g.reflection}”</T> : null}
              </View>
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}
