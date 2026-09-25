import { MOODS, type Entry } from '@gunluk/core';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { View } from 'react-native';
import { space, useColors } from '@/theme';
import { PRIVACY } from './pickers';
import { Card, T } from './ui';

export function formatDate(iso: string, withTime = false): string {
  return new Date(iso).toLocaleDateString('tr-TR', {
    day: 'numeric', month: 'long', year: 'numeric', weekday: 'long',
    ...(withTime ? { hour: '2-digit', minute: '2-digit' } : {}),
  });
}

export function EntryCard({ entry, label }: { entry: Entry; label?: string }) {
  const c = useColors();
  const mood = MOODS.find((m) => m.value === entry.mood);
  return (
    <Card onPress={() => router.push(`/entry/${entry.id}`)} style={{ gap: space.s }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        {mood ? <T v="body" style={{ fontSize: 20 }}>{mood.emoji}</T> : null}
        <T v="small" style={{ flex: 1 }}>{label ?? formatDate(entry.createdAt)}</T>
        {entry.privacy === 'private' ? <T v="small">{PRIVACY.private.icon}</T> : null}
      </View>
      <T v="serif" numberOfLines={entry.kind === 'one_word' ? 1 : 4} style={entry.kind === 'one_word' ? { fontSize: 22 } : undefined}>
        {entry.text}
      </T>
      {entry.photos.length > 0 ? (
        <View style={{ flexDirection: 'row', gap: space.xs }}>
          {entry.photos.slice(0, 3).map((uri) => (
            <Image key={uri} source={{ uri }} style={{ width: 64, height: 64, borderRadius: 10, backgroundColor: c.sunken }} contentFit="cover" />
          ))}
        </View>
      ) : null}
    </Card>
  );
}
