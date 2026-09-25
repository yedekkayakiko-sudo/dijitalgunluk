import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Alert, Pressable, TextInput, View } from 'react-native';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { aiReady } from '@/lib/api';
import { newId } from '@/lib/db';
import { CATEGORY_LABELS, forgetAllNotes, loadNotes, maybeUpdateNotes, saveNotes, type MemoryNote, type NoteCategory } from '@/lib/memory';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

export default function Memory() {
  const c = useColors();
  const { settings } = useSettings();
  const [notes, setNotes] = useState<MemoryNote[]>([]);
  const [editing, setEditing] = useState<MemoryNote | null>(null);
  const [draft, setDraft] = useState('');
  const [category, setCategory] = useState<NoteCategory>('kisi');
  const [updating, setUpdating] = useState(false);

  const load = useCallback(() => {
    loadNotes().then(setNotes);
  }, []);
  useFocusEffect(load);

  const persist = async (next: MemoryNote[]) => {
    setNotes(next);
    await saveNotes(next);
  };

  const startAdd = () => {
    setEditing({ id: newId(), category: 'kisi', text: '', pinned: true });
    setDraft('');
    setCategory('kisi');
  };

  const save = async () => {
    if (!editing || !draft.trim()) return;
    const note = { ...editing, text: draft.trim().slice(0, 200), category, pinned: true };
    await persist(notes.some((n) => n.id === note.id) ? notes.map((n) => (n.id === note.id ? note : n)) : [note, ...notes]);
    setEditing(null);
  };

  const remove = (n: MemoryNote) =>
    Alert.alert('Bu not unutulsun mu?', n.text, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Unut', style: 'destructive', onPress: () => persist(notes.filter((x) => x.id !== n.id)) },
    ]);

  const forgetAll = () =>
    Alert.alert('Hepsi unutulsun mu?', `${settings.mascotName} seninle ilgili tüm notlarını siler. Günlük sayfaların silinmez.`, [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Hepsini unut', style: 'destructive', onPress: async () => { await forgetAllNotes(); load(); } },
    ]);

  const refresh = async () => {
    setUpdating(true);
    const ok = await maybeUpdateNotes(true);
    setUpdating(false);
    load();
    if (!ok) Alert.alert('Şimdilik yeni bir şey yok', 'Son güncellemeden bu yana “tam analiz” izinli yeni bir sayfa yok ya da bağlantı kurulamadı.');
  };

  const groups = (Object.keys(CATEGORY_LABELS) as NoteCategory[]).map((cat) => ({ cat, items: notes.filter((n) => n.category === cat) })).filter((g) => g.items.length);

  return (
    <Screen>
      <MascotBubble
        text={
          notes.length
            ? 'Sayfalarından seni böyle tanıdım. Yanlış bir şey varsa düzelt ya da sil; neyi hatırlayacağıma sen karar verirsin.'
            : aiReady(settings)
              ? 'Henüz not almadım. “Tam analiz” izinli birkaç sayfa yazdıktan sonra seni tanımaya başlayacağım.'
              : 'Seni tanımam için yapay zekânın açık olması gerekiyor. Ama istersen kendin de not ekleyebilirsin.'
        }
        size={60}
      />
      <Gap />
      <Row>
        <Button label="+ Not ekle" small onPress={startAdd} />
        {aiReady(settings) ? <Button label={updating ? 'Güncelleniyor…' : 'Şimdi güncelle'} kind="secondary" small onPress={refresh} disabled={updating} /> : null}
        {updating ? <ActivityIndicator color={c.accent} /> : null}
      </Row>

      {editing ? (
        <>
          <Gap />
          <Card style={{ gap: space.s }}>
            <TextInput
              value={draft}
              onChangeText={setDraft}
              autoFocus
              multiline
              maxLength={200}
              placeholder="Ör. Zor günlerde ablamla konuşmak iyi geliyor."
              placeholderTextColor={c.muted}
              style={{ color: c.text, fontSize: 16, minHeight: 60 }}
            />
            <Row>
              {(Object.keys(CATEGORY_LABELS) as NoteCategory[]).map((cat) => (
                <Chip key={cat} label={CATEGORY_LABELS[cat]} selected={category === cat} onPress={() => setCategory(cat)} />
              ))}
            </Row>
            <Row>
              <Button label="Kaydet" small onPress={save} disabled={!draft.trim()} />
              <Button label="Vazgeç" kind="ghost" small onPress={() => setEditing(null)} />
            </Row>
          </Card>
        </>
      ) : null}

      {groups.map((g) => (
        <View key={g.cat} style={{ marginTop: space.l, gap: space.s }}>
          <T v="heading">{CATEGORY_LABELS[g.cat]}</T>
          {g.items.map((n) => (
            <Pressable
              key={n.id}
              onPress={() => {
                setEditing(n);
                setDraft(n.text);
                setCategory(n.category);
              }}
              onLongPress={() => remove(n)}
              accessibilityHint="Düzenlemek için dokun, silmek için basılı tut">
              <Card style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
                <T v="body" style={{ flex: 1 }}>{n.text}</T>
                {n.pinned ? <T v="small">📌</T> : null}
              </Card>
            </Pressable>
          ))}
        </View>
      ))}

      {notes.length ? (
        <>
          <Gap h={space.l} />
          <T v="small">Düzenlemek için dokun, silmek için basılı tut. 📌 işaretli notları sen yazdın; {settings.mascotName} onları değiştirmez.</T>
          <Gap />
          <Button label="Hepsini unut" kind="danger" onPress={forgetAll} />
        </>
      ) : null}
    </Screen>
  );
}
