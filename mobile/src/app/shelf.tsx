import { keepsakeFor } from '@gunluk/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Pressable, View } from 'react-native';
import { Card, Gap, Label, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { listEntries, type StoredEntry } from '@/lib/db';
import { space, useColors } from '@/theme';

/*
 * The memory shelf: every page's keepsake, month by month. Over time it
 * becomes a picture of a life, and each object opens its page.
 */
export default function Shelf() {
  const c = useColors();
  const [months, setMonths] = useState<{ key: string; label: string; entries: StoredEntry[] }[]>([]);

  useFocusEffect(
    useCallback(() => {
      track('shelf_opened');
      listEntries().then((all) => {
        const groups = new Map<string, StoredEntry[]>();
        for (const e of all) {
          const d = new Date(e.createdAt);
          const key = `${d.getFullYear()}-${d.getMonth()}`;
          groups.set(key, [...(groups.get(key) ?? []), e]);
        }
        setMonths(
          [...groups.entries()].map(([key, entries]) => ({
            key,
            label: new Date(entries[0].createdAt).toLocaleDateString('tr-TR', { month: 'long', year: 'numeric' }),
            entries,
          })),
        );
      });
    }, []),
  );

  if (months.length === 0) {
    return (
      <Screen>
        <T v="muted">Rafın henüz boş. Her sayfan buraya küçük bir anı bırakacak: kahve içtiğin gün bir fincan, denize gittiğin gün bir dalga, zor bir günde bir mum.</T>
      </Screen>
    );
  }

  return (
    <Screen>
      <T v="muted">Her sayfan rafa bir anı bıraktı. Bir anıya dokun, o güne dön.</T>
      {months.map((m) => {
        const counts = new Map<string, number>();
        for (const e of m.entries) {
          const g = keepsakeFor(e).glyph;
          counts.set(g, (counts.get(g) ?? 0) + 1);
        }
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
        return (
          <View key={m.key}>
            <Gap h={space.l} />
            <Row style={{ justifyContent: 'space-between' }}>
              <Label>{m.label}</Label>
              <T v="small">{m.entries.length} anı · {top.map(([g, n]) => `${g}${n > 1 ? `×${n}` : ''}`).join(' ')}</T>
            </Row>
            <Gap h={space.s} />
            <Card style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.s, padding: space.s }}>
              {m.entries.map((e) => {
                const k = keepsakeFor(e);
                return (
                  <Pressable
                    key={e.id}
                    onPress={() => router.push(`/entry/${e.id}`)}
                    accessibilityLabel={`${new Date(e.createdAt).getDate()}: ${k.label}`}
                    style={{ width: 52, height: 60, borderRadius: 12, alignItems: 'center', justifyContent: 'center', backgroundColor: c.sunken }}>
                    <T v="body" style={{ fontSize: 24, lineHeight: 30 }}>{k.glyph}</T>
                    <T v="small" style={{ fontSize: 11, lineHeight: 13 }}>{new Date(e.createdAt).getDate()}</T>
                  </Pressable>
                );
              })}
            </Card>
          </View>
        );
      })}
    </Screen>
  );
}
