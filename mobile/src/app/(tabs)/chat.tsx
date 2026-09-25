import { useFocusEffect } from 'expo-router';
import { useCallback, useRef, useState } from 'react';
import { Alert, FlatList, KeyboardAvoidingView, Platform, Pressable, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { EntryCard } from '@/components/EntryCard';
import { Mascot } from '@/components/Mascot';
import { reportMascotText } from '@/components/MascotBubble';
import { SupportStrip } from '@/components/SupportStrip';
import { Thinking } from '@/components/Thinking';
import { Chip, Row, T } from '@/components/ui';
import { aiReady } from '@/lib/api';
import { sendChat } from '@/lib/chat';
import { clearChat, getEntry, listChat, type ChatMessage, type StoredEntry } from '@/lib/db';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const STARTERS = ['Bugün içimi dökmek istiyorum', '3 yıl önce bu zamanlar ne yapıyordum?', 'Son zamanlarda en çok kimden bahsettim?', 'Bana moral ver'];

type ChatRow = ChatMessage & { pages: StoredEntry[] };

export default function Chat() {
  const c = useColors();
  const { settings } = useSettings();
  const { info } = usePet();
  const [rows, setRows] = useState<ChatRow[]>([]);
  const [text, setText] = useState('');
  const [sending, setSending] = useState(false);
  const [streaming, setStreaming] = useState<string | null>(null);
  const list = useRef<FlatList<ChatRow>>(null);

  const withPages = async (m: ChatMessage): Promise<ChatRow> => ({
    ...m,
    pages: (await Promise.all(m.pageIds.map(getEntry))).filter((e): e is StoredEntry => !!e),
  });

  const load = useCallback(() => {
    listChat(80).then(async (ms) => setRows(await Promise.all(ms.map(withPages))));
  }, []);
  useFocusEffect(load);

  const send = async (t = text) => {
    const msg = t.trim();
    if (!msg || sending) return;
    setText('');
    setSending(true);
    setRows((r) => [...r, { id: `tmp-${Date.now()}`, at: new Date().toISOString(), role: 'user', text: msg, pageIds: [], crisis: 'none', pages: [] }]);
    try {
      await sendChat(msg, setStreaming);
    } finally {
      setSending(false);
      setStreaming(null);
      load();
    }
  };

  const clear = () =>
    Alert.alert('Sohbet silinsin mi?', 'Bu konuşma cihazından kalıcı olarak silinir. Günlük sayfaların etkilenmez.', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sil', style: 'destructive', onPress: async () => { await clearChat(); load(); } },
    ]);

  const ai = aiReady(settings);
  // The support row appears once, under the first reply to explicit crisis language.
  const firstCrisisReply = rows.findIndex((r, i) => r.role === 'assistant' && (r.crisis === 'acute' || rows[i - 1]?.crisis === 'acute'));

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ padding: space.m, paddingBottom: space.s, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Row style={{ flexWrap: 'nowrap' }}>
            <Mascot size={40} look={info.look} breathing={false} />
            <View>
              <T v="heading">{settings.mascotName}</T>
              <T v="small" style={{ fontSize: 12 }}>{ai ? 'Seni dinliyor' : 'Sayfalarını karıştırabilir'}</T>
            </View>
          </Row>
          {rows.length ? (
            <Pressable onPress={clear} hitSlop={8} accessibilityRole="button">
              <T v="small">Temizle</T>
            </Pressable>
          ) : null}
        </Row>

        <FlatList
          ref={list}
          data={rows}
          keyExtractor={(r) => r.id}
          contentContainerStyle={{ padding: space.m, gap: space.s, flexGrow: 1 }}
          onContentSizeChange={() => list.current?.scrollToEnd({ animated: true })}
          ListEmptyComponent={
            <View style={{ flex: 1, justifyContent: 'center', gap: space.m }}>
              <T v="muted" style={{ textAlign: 'center' }}>
                {ai
                  ? `Aklından geçenleri anlatabilir, geçmişine dair bir şey sorabilirsin. ${settings.mascotName} sayfalarını hatırlar; “sadece ben” sayfaların hariç.`
                  : 'Geçmişine dair bir şey sor, sayfalarını birlikte karıştıralım. Sohbet için Ayarlar’dan yapay zekâyı açabilirsin.'}
              </T>
              <Row style={{ justifyContent: 'center' }}>
                {STARTERS.map((s) => (
                  <Chip key={s} label={s} onPress={() => send(s)} />
                ))}
              </Row>
            </View>
          }
          renderItem={({ item, index }) =>
            item.role === 'user' ? (
              <View style={{ alignSelf: 'flex-end', maxWidth: '85%', backgroundColor: c.accent, borderRadius: 18, borderBottomRightRadius: 4, padding: space.m }}>
                <T v="body" style={{ color: c.accentText }}>{item.text}</T>
              </View>
            ) : (
              <View style={{ gap: space.s }}>
                <Pressable
                  onLongPress={() => ai && reportMascotText(item.text)}
                  style={{ alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, padding: space.m }}>
                  <T v="body">{item.text}</T>
                </Pressable>
                {index === firstCrisisReply ? <SupportStrip /> : null}
                {item.pages.map((e) => (
                  <EntryCard key={e.id} entry={e} />
                ))}
              </View>
            )
          }
          ListFooterComponent={
            sending ? (
              streaming ? (
                <View style={{ alignSelf: 'flex-start', maxWidth: '88%', backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 18, borderBottomLeftRadius: 4, padding: space.m, marginTop: space.s }}>
                  <T v="body">{streaming}</T>
                </View>
              ) : (
                <View style={{ marginTop: space.s }}>
                  <Thinking />
                </View>
              )
            ) : null
          }
        />
        {ai && rows.length ? <T v="small" style={{ textAlign: 'center', fontSize: 11 }}>Bir yanıtı bildirmek için üzerine basılı tut.</T> : null}

        <View style={{ flexDirection: 'row', gap: space.s, padding: space.m, borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card }}>
          <TextInput
            value={text}
            onChangeText={setText}
            placeholder="Aklından geçenleri yaz…"
            placeholderTextColor={c.muted}
            multiline
            style={{ flex: 1, maxHeight: 120, backgroundColor: c.bg, borderRadius: 14, paddingHorizontal: 14, paddingVertical: 10, color: c.text, fontSize: 16 }}
            accessibilityLabel="Mesaj"
          />
          <Pressable
            onPress={() => send()}
            disabled={!text.trim() || sending}
            accessibilityRole="button"
            accessibilityLabel="Gönder"
            style={{ alignSelf: 'flex-end', backgroundColor: c.accent, opacity: !text.trim() || sending ? 0.4 : 1, borderRadius: 14, paddingHorizontal: 16, paddingVertical: 11 }}>
            <T v="body" style={{ color: c.accentText, fontWeight: '700' }}>Gönder</T>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
