import { MOODS, type Entity } from '@gunluk/core';
import { router, Stack, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { EntryCard, formatDate } from '@/components/EntryCard';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { deleteEntity, entriesForEntity, getEntity, renameEntity, type StoredEntry } from '@/lib/db';
import { space, useColors } from '@/theme';

export default function Person() {
  const c = useColors();
  const { id } = useLocalSearchParams<{ id: string }>();
  const [entity, setEntity] = useState<Entity | null>(null);
  const [entries, setEntries] = useState<StoredEntry[]>([]);
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState('');

  const load = useCallback(() => {
    getEntity(id).then((e) => {
      setEntity(e);
      setName(e?.name ?? '');
    });
    entriesForEntity(id).then(setEntries);
  }, [id]);

  useFocusEffect(load);

  if (!entity) return <Screen><T v="muted">Bulunamadı.</T></Screen>;

  const avg = entity.moodCount ? Math.round(entity.moodSum / entity.moodCount) : null;
  const mood = avg ? MOODS[avg - 1] : null;

  const forget = () =>
    Alert.alert(`${entity.name} unutulsun mu?`, 'Sayfaların silinmez; sadece maskotun bu kişiye dair hatırladıkları silinir.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Unut', style: 'destructive', onPress: async () => { await deleteEntity(entity.id); router.back(); } },
    ]);

  return (
    <Screen>
      <Stack.Screen options={{ title: entity.kind === 'place' ? 'Yer' : 'Kişi' }} />
      {editing ? (
        <Row style={{ flexWrap: 'nowrap' }}>
          <TextInput value={name} onChangeText={setName} autoFocus style={{ flex: 1, fontSize: 24, color: c.text, borderBottomWidth: 1, borderColor: c.accent }} />
          <Button label="Kaydet" small onPress={async () => { await renameEntity(entity.id, name); setEditing(false); load(); }} />
        </Row>
      ) : (
        <T v="title">{entity.kind === 'place' ? '📍 ' : ''}{entity.name}</T>
      )}
      <Gap h={space.s} />
      <Card style={{ gap: 4 }}>
        <T v="body">{entity.mentionCount} sayfada geçiyor.</T>
        <T v="muted">İlk kez: {formatDate(entity.firstSeenAt)}</T>
        <T v="muted">Son kez: {formatDate(entity.lastSeenAt)}</T>
        {mood ? <T v="muted">Bu sayfalardaki ortalama ruh hali: {mood.emoji} {mood.label}</T> : null}
      </Card>
      <Gap h={space.s} />
      <Row>
        <Button label="Adını düzelt" kind="secondary" small onPress={() => setEditing(true)} />
        <Button label="Unut" kind="danger" small onPress={forget} />
      </Row>
      <Gap h={space.l} />
      <View style={{ gap: space.s }}>
        {entries.map((e) => (
          <EntryCard key={e.id} entry={e} />
        ))}
      </View>
    </Screen>
  );
}
