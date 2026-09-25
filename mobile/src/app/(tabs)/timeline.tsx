import { dayKey } from '@gunluk/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { EntryCard } from '@/components/EntryCard';
import { Button, Gap, Row, Screen, T } from '@/components/ui';
import { listEntries, type StoredEntry } from '@/lib/db';
import { space, useColors } from '@/theme';

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];

export default function Timeline() {
  const c = useColors();
  const [cursor, setCursor] = useState(() => new Date(new Date().getFullYear(), new Date().getMonth(), 1));
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [selected, setSelected] = useState<string | null>(null);

  useFocusEffect(
    useCallback(() => {
      const from = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const to = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      // Pad by a day on each side: entries are stored in UTC, the calendar is local.
      listEntries({ from: new Date(from.getTime() - 86_400_000).toISOString(), to: new Date(to.getTime() + 86_400_000).toISOString() }).then((es) =>
        setEntries(es.filter((e) => new Date(e.createdAt) >= from && new Date(e.createdAt) < to)),
      );
    }, [cursor]),
  );

  const byDay = useMemo(() => {
    const m = new Map<string, StoredEntry[]>();
    for (const e of entries) m.set(dayKey(e.createdAt), [...(m.get(dayKey(e.createdAt)) ?? []), e]);
    return m;
  }, [entries]);

  const cells = useMemo(() => {
    const first = (cursor.getDay() + 6) % 7; // Monday first
    const days = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [...Array(first).fill(null), ...Array.from({ length: days }, (_, i) => new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))];
  }, [cursor]);

  const shift = (n: number) => {
    setSelected(null);
    setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + n, 1));
  };

  const todayKey = dayKey(new Date());
  const shown = selected ? byDay.get(selected) ?? [] : entries;
  const title = cursor.toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' });

  return (
    <Screen>
      <T v="title">Zaman yolculuğu</T>
      <T v="muted">İstediğin güne git, o günün sayfalarına bak.</T>
      <Gap />
      <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
        <Button label="‹" kind="ghost" small onPress={() => shift(-1)} />
        <Pressable onLongPress={() => shift(-12)} onPress={() => setSelected(null)}>
          <T v="heading" style={{ textTransform: 'capitalize' }}>{title}</T>
        </Pressable>
        <Button label="›" kind="ghost" small onPress={() => shift(1)} />
      </Row>
      <Gap h={space.s} />
      <View style={{ flexDirection: 'row' }}>
        {WEEKDAYS.map((d) => (
          <T key={d} v="small" style={{ flex: 1, textAlign: 'center' }}>{d}</T>
        ))}
      </View>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginTop: 4 }}>
        {cells.map((d, i) => {
          if (!d) return <View key={`e${i}`} style={{ width: `${100 / 7}%`, aspectRatio: 1 }} />;
          const key = dayKey(d);
          const es = byDay.get(key) ?? [];
          const moods = es.map((e) => e.mood).filter((m): m is NonNullable<typeof m> => m != null);
          const avg = moods.length ? Math.round(moods.reduce((a, b) => a + b, 0) / moods.length) : null;
          const isSel = selected === key;
          return (
            <Pressable
              key={key}
              onPress={() => setSelected(isSel ? null : key)}
              accessibilityLabel={`${d.getDate()}, ${es.length} sayfa`}
              style={{ width: `${100 / 7}%`, aspectRatio: 1, padding: 3 }}>
              <View
                style={{
                  flex: 1, borderRadius: 12, alignItems: 'center', justifyContent: 'center',
                  backgroundColor: avg ? c.mood[avg - 1] : es.length ? c.sunken : 'transparent',
                  borderWidth: isSel || key === todayKey ? 2 : 0,
                  borderColor: isSel ? c.accent : c.border,
                }}>
                <Text style={{ color: c.text, fontWeight: es.length ? '700' : '400', opacity: es.length ? 1 : 0.5 }}>{d.getDate()}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
      <Gap />
      <T v="heading">
        {selected ? new Date(selected + 'T12:00:00').toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' }) : 'Bu ayın sayfaları'}
      </T>
      <Gap h={space.s} />
      {shown.length === 0 ? (
        <T v="muted">{selected ? 'Bu gün boş kalmış. Boşluklar da hikâyenin bir parçası.' : 'Bu ay henüz bir sayfa yok.'}</T>
      ) : (
        <View style={{ gap: space.s }}>
          {shown.map((e) => (
            <EntryCard key={e.id} entry={e} />
          ))}
        </View>
      )}
    </Screen>
  );
}
