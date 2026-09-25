import type { Entry, EntryKind, Mood, PrivacyLevel } from '@gunluk/core';
import { Image } from 'expo-image';
import * as Location from 'expo-location';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MoodPicker, PRIVACY, PrivacyPicker, WEATHER } from '@/components/pickers';
import { Button, Chip, Row, T } from '@/components/ui';
import { clearDraft, getEntry, loadDraft, newId, saveDraft, saveEntry, type Draft } from '@/lib/db';
import { afterSave } from '@/lib/mascot';
import { deletePhotos, pickPhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { serif, space, useColors } from '@/theme';

const PROMPTS = [
  'Bugün aklında kalan bir an…',
  'Bugün seni ne gülümsetti?',
  'Şu an nasıl hissediyorsun?',
  'Bugün kiminle vakit geçirdin?',
  'Bugün küçük de olsa ne iyi gitti?',
];

export default function Write() {
  const c = useColors();
  const { settings } = useSettings();
  const params = useLocalSearchParams<{ id?: string; mode?: string }>();
  const editingId = params.id ?? null;

  const [kind, setKind] = useState<EntryKind>(params.mode === 'word' ? 'one_word' : 'entry');
  const [text, setText] = useState('');
  const [mood, setMood] = useState<Mood | null>(null);
  const [weather, setWeather] = useState<string | null>(null);
  const [place, setPlace] = useState<string | null>(null);
  const [photos, setPhotos] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<PrivacyLevel>(settings.defaultPrivacy);
  const [createdAt, setCreatedAt] = useState(() => new Date().toISOString());
  const [loaded, setLoaded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [locating, setLocating] = useState(false);
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const originalPhotos = useRef<string[]>([]);
  const [prompt] = useState(() => PROMPTS[Math.floor(Math.random() * PROMPTS.length)]);

  // Restore: a matching draft wins over the stored entry, so nothing typed is ever lost.
  useEffect(() => {
    (async () => {
      const draft = await loadDraft();
      const existing = editingId ? await getEntry(editingId) : null;
      if (existing) {
        originalPhotos.current = existing.photos;
        setCreatedAt(existing.createdAt);
      }
      const src: Partial<Draft> | null = draft && draft.entryId === editingId ? draft : existing;
      if (src) {
        setKind(src.kind ?? 'entry');
        setText(src.text ?? '');
        setMood(src.mood ?? null);
        setWeather(src.weather ?? null);
        setPlace(src.place ?? null);
        setPhotos(src.photos ?? []);
        setPrivacy(src.privacy ?? settings.defaultPrivacy);
      }
      setLoaded(true);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingId]);

  // Autosave the draft shortly after every change.
  useEffect(() => {
    if (!loaded || saving) return;
    const t = setTimeout(() => {
      if (!text.trim() && photos.length === 0 && !editingId) return;
      saveDraft({ entryId: editingId, kind, text, mood, weather, place, photos, privacy }).then(() => setSavedAt(new Date()));
    }, 600);
    return () => clearTimeout(t);
  }, [loaded, saving, editingId, kind, text, mood, weather, place, photos, privacy]);

  const addPhotos = async () => {
    const uris = await pickPhotos();
    if (uris.length) setPhotos((p) => [...p, ...uris].slice(0, 8));
  };

  const removePhoto = (uri: string) => {
    setPhotos((p) => p.filter((x) => x !== uri));
    if (!originalPhotos.current.includes(uri)) deletePhotos([uri]);
  };

  const addLocation = async () => {
    if (place) return setPlace(null);
    setLocating(true);
    try {
      const perm = await Location.requestForegroundPermissionsAsync();
      if (!perm.granted) {
        Alert.alert('Konum izni verilmedi', 'Sorun değil, konumu elle de yazabilirsin.');
        return;
      }
      const pos = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      const [addr] = await Location.reverseGeocodeAsync(pos.coords);
      // Only a coarse, human label is stored: never coordinates.
      const label = [addr?.district ?? addr?.subregion, addr?.city ?? addr?.region].filter(Boolean).join(', ');
      setPlace(label || null);
    } catch {
      Alert.alert('Konum alınamadı', 'Daha sonra tekrar deneyebilirsin.');
    } finally {
      setLocating(false);
    }
  };

  const close = () => {
    if (!editingId && (text.trim() || photos.length)) {
      Alert.alert('Taslak kaydedildi', 'Yazdıkların kaybolmadı; döndüğünde kaldığın yerden devam edebilirsin.', [
        { text: 'Tamam', onPress: () => router.back() },
      ]);
    } else {
      router.back();
    }
  };

  const discard = () => {
    Alert.alert('Taslağı sil?', 'Bu sayfada yazdıkların silinecek.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Sil', style: 'destructive',
        onPress: async () => {
          deletePhotos(photos.filter((p) => !originalPhotos.current.includes(p)));
          await clearDraft();
          router.back();
        },
      },
    ]);
  };

  const save = async () => {
    const body = kind === 'one_word' ? text.trim().split(/\s+/).slice(0, 3).join(' ') : text.trim();
    if (!body && photos.length === 0) return;
    setSaving(true);
    try {
      const now = new Date().toISOString();
      const entry: Entry = {
        id: editingId ?? newId(), createdAt, updatedAt: now, kind, text: body, mood, weather, place, photos, privacy,
      };
      await saveEntry(entry);
      deletePhotos(originalPhotos.current.filter((p) => !photos.includes(p)));
      await clearDraft();
      await afterSave(entry, !editingId).catch(() => null);
      router.replace(`/entry/${entry.id}?fresh=1`);
    } catch {
      setSaving(false);
      Alert.alert('Kaydedilemedi', 'Taslağın güvende. Birazdan tekrar dene.');
    }
  };

  if (!loaded) return <View style={{ flex: 1, backgroundColor: c.bg }} />;

  const dateLabel = new Date(createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'long' });

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <Row style={{ paddingHorizontal: space.m, paddingVertical: space.s, justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <Button label="Kapat" kind="ghost" small onPress={close} />
          <View style={{ alignItems: 'center', flex: 1 }}>
            <T v="small">{dateLabel}</T>
            <T v="small" style={{ fontSize: 11 }}>{savedAt ? 'Taslak kaydedildi' : ' '}</T>
          </View>
          <Button label={saving ? '…' : 'Kaydet'} small onPress={save} disabled={saving || (!text.trim() && photos.length === 0)} />
        </Row>

        {kind === 'one_word' ? (
          <View style={{ flex: 1, justifyContent: 'center', padding: space.l, gap: space.l }}>
            <T v="title" style={{ textAlign: 'center' }}>Bugünü bir kelimeyle anlat</T>
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="yorucu, huzurlu, koşturmaca…"
              placeholderTextColor={c.muted}
              autoFocus
              maxLength={40}
              returnKeyType="done"
              onSubmitEditing={save}
              style={{ fontFamily: serif, fontSize: 34, textAlign: 'center', color: c.text, borderBottomWidth: 2, borderColor: c.accent, paddingVertical: space.s }}
            />
            <MoodPicker value={mood} onChange={setMood} />
            <Button label="Uzun uzun yazmak istiyorum" kind="ghost" small onPress={() => setKind('entry')} />
          </View>
        ) : (
          <>
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: space.m, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder={prompt}
                placeholderTextColor={c.muted}
                multiline
                autoFocus={!editingId}
                textAlignVertical="top"
                scrollEnabled={false}
                style={{ fontFamily: serif, fontSize: 19, lineHeight: 30, color: c.text, minHeight: 280 }}
                accessibilityLabel="Günlük metni"
              />
              {photos.length > 0 ? (
                <Row style={{ marginTop: space.m }}>
                  {photos.map((uri) => (
                    <Pressable key={uri} onLongPress={() => removePhoto(uri)} accessibilityHint="Kaldırmak için basılı tut">
                      <Image source={{ uri }} style={{ width: 92, height: 92, borderRadius: 12, backgroundColor: c.sunken }} contentFit="cover" />
                    </Pressable>
                  ))}
                </Row>
              ) : null}
              {photos.length > 0 ? <T v="small" style={{ marginTop: 4 }}>Fotoğrafı kaldırmak için basılı tut.</T> : null}
            </ScrollView>

            <View style={{ borderTopWidth: 1, borderColor: c.border, backgroundColor: c.card, padding: space.m, gap: space.m }}>
              <MoodPicker value={mood} onChange={setMood} />
              <Row>
                <Chip label="📷 Fotoğraf" onPress={addPhotos} />
                <Chip label={locating ? 'Konum…' : place ? `📍 ${place}` : '📍 Konum'} selected={!!place} onPress={addLocation} />
                <Chip label={`${PRIVACY[privacy].icon} ${PRIVACY[privacy].label}`} selected={showDetails} onPress={() => setShowDetails((s) => !s)} />
                {locating ? <ActivityIndicator color={c.accent} /> : null}
              </Row>
              {showDetails ? (
                <View style={{ gap: space.m }}>
                  <PrivacyPicker value={privacy} onChange={setPrivacy} />
                  <Row>
                    {WEATHER.map((w) => (
                      <Chip key={w} label={w} selected={weather === w} onPress={() => setWeather(weather === w ? null : w)} />
                    ))}
                  </Row>
                  {!editingId ? <Button label="Taslağı sil" kind="danger" small onPress={discard} /> : null}
                </View>
              ) : null}
            </View>
          </>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
