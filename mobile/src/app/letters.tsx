import { isOpenable, LETTER_PRESETS, openDateFor, timeUntil, type FutureLetter } from '@gunluk/core';
import { useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { Alert, TextInput, View } from 'react-native';
import { formatDate } from '@/components/EntryCard';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { addLetter, deleteLetter, listLetters, markLetterOpened } from '@/lib/db';
import { scheduleOnDate } from '@/lib/notifications';
import { serif, space, useColors } from '@/theme';

export default function Letters() {
  const c = useColors();
  const [letters, setLetters] = useState<FutureLetter[]>([]);
  const [writing, setWriting] = useState(false);
  const [body, setBody] = useState('');
  const [months, setMonths] = useState<number>(12);
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(() => {
    listLetters().then(setLetters);
  }, []);
  useFocusEffect(load);

  const seal = async () => {
    if (!body.trim()) return;
    await addLetter(openDateFor(months).toISOString(), body.trim());
    await scheduleOnDate(openDateFor(months), 'Geçmişten bir mektubun var ✉️', 'Kendine yazdığın mektubun açılma zamanı geldi.', 'letter');
    track('letter_written', { months });
    setBody('');
    setWriting(false);
    load();
    Alert.alert('Mektubun mühürlendi', `${formatDate(openDateFor(months).toISOString())} tarihinde açılabilecek. O zamana kadar sen de okuyamazsın.`);
  };

  const read = async (l: FutureLetter) => {
    if (!l.openedAt) track('letter_opened');
    await markLetterOpened(l.id);
    setOpen(open === l.id ? null : l.id);
    load();
  };

  const remove = (l: FutureLetter) =>
    Alert.alert('Mektup silinsin mi?', 'Bu işlem geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await deleteLetter(l.id); load(); } },
    ]);

  return (
    <Screen>
      {writing ? (
        <Card style={{ gap: space.m }}>
          <T v="heading">Sevgili gelecekteki ben,</T>
          <TextInput
            value={body}
            onChangeText={setBody}
            multiline
            autoFocus
            placeholder="Şu an neler oluyor, neyi umuyorsun, kendine ne hatırlatmak istersin?"
            placeholderTextColor={c.muted}
            textAlignVertical="top"
            style={{ fontFamily: serif, fontSize: 17, lineHeight: 26, color: c.text, minHeight: 200 }}
          />
          <T v="small">Ne zaman açılsın?</T>
          <Row>
            {LETTER_PRESETS.map((p) => (
              <Chip key={p.months} label={p.label} selected={months === p.months} onPress={() => setMonths(p.months)} />
            ))}
          </Row>
          <Row>
            <Button label="Mühürle" onPress={seal} disabled={!body.trim()} />
            <Button label="Vazgeç" kind="ghost" onPress={() => setWriting(false)} />
          </Row>
        </Card>
      ) : (
        <Button label="Yeni mektup yaz" onPress={() => setWriting(true)} />
      )}
      <Gap h={space.l} />
      {letters.length === 0 && !writing ? <T v="muted">Henüz mektup yok. Bugünkü sen, yarınki sana ne söylemek isterdi?</T> : null}
      <View style={{ gap: space.s }}>
        {letters.map((l) => {
          const ready = isOpenable(l);
          return (
            <Card key={l.id} onPress={ready ? () => read(l) : undefined} style={{ gap: space.s, opacity: ready ? 1 : 0.85 }}>
              <Row style={{ justifyContent: 'space-between' }}>
                <T v="heading">{ready ? (l.openedAt ? '📖 Açılmış mektup' : '✉️ Açılmaya hazır!') : '🔒 Mühürlü'}</T>
                <Button label="Sil" kind="ghost" small onPress={() => remove(l)} />
              </Row>
              <T v="small">
                {formatDate(l.createdAt)} tarihinde yazıldı · {ready ? `${formatDate(l.openAt)} itibarıyla açık` : `açılmasına ${timeUntil(l.openAt)}`}
              </T>
              {ready && open === l.id ? <T v="serif">{l.body}</T> : null}
            </Card>
          );
        })}
      </View>
    </Screen>
  );
}
