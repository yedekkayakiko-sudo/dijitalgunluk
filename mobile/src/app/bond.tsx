import { ACCESSORIES, BOND_POINTS, FORMS, insightsFor, type Insight } from '@gunluk/core';
import { Stack, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { Icon } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { Card, Gap, Label, Progress, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { kvGet, kvSet, listEntities, listEntries } from '@/lib/db';
import { setAccessory, usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const HOW: [string, number][] = [
  ['Bir sayfa yazmak', BOND_POINTS.entry],
  ['Uzun, derinden bir sayfa', BOND_POINTS.deep_entry],
  ['Hedefine bakmak, hedefini değerlendirmek', BOND_POINTS.goal_review],
  ['Geleceğe mektup', BOND_POINTS.letter],
  ['Birkaç günlük aradan sonra dönmek', BOND_POINTS.return],
  ['Eski bir sayfayı yeniden okumak', BOND_POINTS.memory],
  ['Birlikte nefes, sohbet, iyi geceler', BOND_POINTS.breathe],
];

export default function Bond() {
  const c = useColors();
  const { settings } = useSettings();
  const { info, bond, traits, refresh } = usePet();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [pages, setPages] = useState(0);

  useFocusEffect(
    useCallback(() => {
      (async () => {
        await refresh();
        const [all, people] = await Promise.all([listEntries(), listEntities('person')]);
        const cards = insightsFor(all, people);
        setInsights(cards);
        setPages(all.length);
        const seen = new Set<string>(JSON.parse((await kvGet('insights-seen')) ?? '[]'));
        cards.filter((x) => x.unlocked).forEach((x) => seen.add(x.id));
        await kvSet('insights-seen', JSON.stringify([...seen]));
        track('insights_opened', { unlocked: cards.filter((x) => x.unlocked).length });
      })();
    }, [refresh]),
  );

  const wear = async (id: (typeof ACCESSORIES)[number]['id']) => {
    await setAccessory(id);
    track('accessory_set', { id });
  };

  return (
    <Screen>
      <Stack.Screen options={{ title: settings.mascotName }} />
      <View style={{ alignItems: 'center', gap: space.s }}>
        <Mascot size={190} expression="happy" look={info.look} night={false} />
        <T v="title">{settings.mascotName}</T>
        <T v="muted">
          Seviye {info.level} · {info.chapter.name}
          {info.age ? ` · ${info.age.label}` : ''}
        </T>
      </View>
      <Gap h={space.s} />
      <Progress value={info.progress} />
      <Gap h={4} />
      <T v="small" style={{ textAlign: 'center' }}>
        {info.maxed ? 'En yüksek seviyedesiniz: can dostu.' : `Sonraki seviyeye ${info.toNext} puan${info.next ? ` · yeni görünüm seviye ${info.next.level}'da` : ''}`}
      </T>

      <Gap h={space.l} />
      <Label>Seninle büyüyen yolculuk</Label>
      <Gap h={space.s} />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: space.s, paddingRight: space.m }}>
        {FORMS.map((f) => {
          const open = info.level >= f.level;
          return (
            <View key={f.id} style={{ width: 92, alignItems: 'center', gap: 4, padding: space.s, borderRadius: 14, backgroundColor: f.id === info.form.id ? c.accentSoft : c.card, borderWidth: 1, borderColor: c.border }}>
              <View style={{ height: 78, justifyContent: 'flex-end', opacity: open ? 1 : 0.22 }}>
                <Mascot size={70} look={{ form: f.id }} breathing={false} dressed={false} />
              </View>
              <T v="small" style={{ color: open ? c.text : c.muted, fontWeight: '600' }}>{f.name}</T>
              <T v="small" style={{ fontSize: 11 }}>{open ? '✓' : `Seviye ${f.level}`}</T>
            </View>
          );
        })}
      </ScrollView>

      <Gap h={space.l} />
      <Label>Giydir</Label>
      <Gap h={space.s} />
      <Row gap={space.s}>
        {ACCESSORIES.map((a) => {
          const open = info.level >= a.level;
          const on = bond.accessory === a.id;
          return (
            <Pressable
              key={a.id}
              disabled={!open}
              onPress={() => wear(a.id)}
              accessibilityRole="button"
              accessibilityState={{ selected: on, disabled: !open }}
              style={{ width: '31%', alignItems: 'center', gap: 2, paddingVertical: space.s, borderRadius: 14, borderWidth: on ? 2 : 1, borderColor: on ? c.accent : c.border, backgroundColor: c.card }}>
              <View style={{ height: 60, justifyContent: 'flex-end', opacity: open ? 1 : 0.3 }}>
                <Mascot size={56} look={{ form: info.form.id, accessory: a.id }} breathing={false} night={false} />
              </View>
              <T v="small" style={{ color: c.text }}>{a.name}</T>
              {!open ? (
                <Row gap={2}>
                  <Icon name="lock" size={12} color={c.muted} />
                  <T v="small" style={{ fontSize: 11 }}>Seviye {a.level}</T>
                </Row>
              ) : null}
            </Pressable>
          );
        })}
      </Row>

      <Gap h={space.l} />
      <Label>Sana benzeyen yanları</Label>
      <Gap h={space.s} />
      {traits.length === 0 ? (
        <T v="muted">Birkaç sayfa daha yazınca sana benzemeye başlayacağım: gece yazıyorsan gece kuşu olurum, kahveyi seviyorsan elimde bir fincan olur.</T>
      ) : (
        <View style={{ gap: space.s }}>
          {traits.map((t) => (
            <Card key={t.id} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
              <T v="body" style={{ fontSize: 26, lineHeight: 32 }}>{t.glyph}</T>
              <View style={{ flex: 1 }}>
                <T v="heading">{t.label}</T>
                <T v="muted">{t.why}</T>
              </View>
            </Card>
          ))}
        </View>
      )}

      <Gap h={space.l} />
      <Label>Seni tanıdıkça</Label>
      <T v="small">Sayfaların çoğaldıkça sana dair fark ettiklerim açılır. Hepsi telefonunda hesaplanır.</T>
      <Gap h={space.s} />
      <View style={{ gap: space.s }}>
        {insights.map((x) => (
          <Card key={x.id} style={{ gap: 4, opacity: x.unlocked ? 1 : 0.75 }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T v="heading" style={{ flex: 1 }}>{x.glyph} {x.title}</T>
              {!x.unlocked ? <Icon name="lock" size={16} color={c.muted} /> : null}
            </Row>
            {x.unlocked ? (
              <T v="body">{x.text}</T>
            ) : pages >= x.unlockAt ? (
              <T v="muted">Bir şeyler seziyorum ama emin olmak için biraz daha yazmanı bekliyorum.</T>
            ) : (
              <>
                <T v="muted">{x.unlockAt - pages} sayfa sonra açılacak.</T>
                <Progress value={pages / x.unlockAt} height={4} />
              </>
            )}
          </Card>
        ))}
      </View>

      <Gap h={space.l} />
      <Label>Bağımız nasıl güçlenir?</Label>
      <Gap h={space.s} />
      <Card style={{ gap: 6 }}>
        {HOW.map(([what, pts]) => (
          <Row key={what} style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            <T v="body" style={{ flex: 1 }}>{what}</T>
            <T v="small">+{pts}</T>
          </Row>
        ))}
        <T v="small" style={{ marginTop: 4 }}>Günde en fazla 70 puan: bağ, ekrana basmakla değil, gerçek günlerle güçlenir. Yazmadığın günler hiçbir şey kaybettirmez.</T>
      </Card>
    </Screen>
  );
}
