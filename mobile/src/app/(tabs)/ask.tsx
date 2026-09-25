import type { CrisisLevel } from '@gunluk/core';
import { useState } from 'react';
import { ActivityIndicator, TextInput, View } from 'react-native';
import { CrisisCard } from '@/components/CrisisCard';
import { EntryCard } from '@/components/EntryCard';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Chip, Gap, Row, Screen, T } from '@/components/ui';
import type { StoredEntry } from '@/lib/db';
import { askMascot } from '@/lib/mascot';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const EXAMPLES = ['Geçen yaz neler yaptım?', 'Ayşe ile en son ne zaman görüştüm?', '2 yıl önce bu zamanlar neyle uğraşıyordum?'];

interface Turn {
  question: string;
  answer: string;
  aiGenerated: boolean;
  entries: StoredEntry[];
  crisis: CrisisLevel;
}

export default function Ask() {
  const c = useColors();
  const { settings } = useSettings();
  const [q, setQ] = useState('');
  const [loading, setLoading] = useState(false);
  const [turns, setTurns] = useState<Turn[]>([]);

  const ask = async (question = q) => {
    const text = question.trim();
    if (!text || loading) return;
    setLoading(true);
    setQ('');
    try {
      const r = await askMascot(text);
      setTurns((t) => [{ question: text, answer: r.answer, aiGenerated: r.aiGenerated, entries: r.entries, crisis: r.crisisLevel }, ...t]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Screen>
      <T v="title">Hatırla</T>
      <T v="muted">
        Geçmişine dair bir şey sor, {settings.mascotName} sayfalarını karıştırsın. “Sadece ben” sayfaların aramaya katılmaz.
      </T>
      <Gap />
      <View style={{ flexDirection: 'row', gap: space.s, alignItems: 'center' }}>
        <TextInput
          value={q}
          onChangeText={setQ}
          placeholder="3 yıl önce tanıştığım çocuk kimdi?"
          placeholderTextColor={c.muted}
          onSubmitEditing={() => ask()}
          returnKeyType="search"
          style={{ flex: 1, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, color: c.text, fontSize: 16 }}
        />
        <Button label="Sor" small onPress={() => ask()} disabled={!q.trim() || loading} />
      </View>
      {turns.length === 0 ? (
        <>
          <Gap h={space.s} />
          <Row>
            {EXAMPLES.map((e) => (
              <Chip key={e} label={e} onPress={() => ask(e)} />
            ))}
          </Row>
        </>
      ) : null}
      {loading ? (
        <>
          <Gap />
          <ActivityIndicator color={c.accent} />
        </>
      ) : null}
      {turns.map((t, i) => (
        <View key={turns.length - i} style={{ marginTop: space.l, gap: space.s }}>
          <T v="heading">“{t.question}”</T>
          {t.crisis !== 'none' ? (
            <CrisisCard level={t.crisis} />
          ) : (
            <>
              <MascotBubble text={t.answer} expression={t.entries.length ? 'happy' : 'curious'} size={56} reportable={t.aiGenerated} />
              {t.entries.map((e) => (
                <EntryCard key={e.id} entry={e} />
              ))}
            </>
          )}
        </View>
      ))}
    </Screen>
  );
}
