import { moodSeries, type Entity } from '@gunluk/core';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { MoodChart } from '@/components/MoodChart';
import { Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { allEntryDates, listEntities, listEntries, type StoredEntry } from '@/lib/db';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme';

export default function Me() {
  const { settings } = useSettings();
  const [people, setPeople] = useState<Entity[]>([]);
  const [places, setPlaces] = useState<Entity[]>([]);
  const [recent, setRecent] = useState<StoredEntry[]>([]);
  const [count, setCount] = useState(0);

  useFocusEffect(
    useCallback(() => {
      listEntities('person').then(setPeople);
      listEntities('place').then(setPlaces);
      listEntries({ from: new Date(Date.now() - 60 * 86_400_000).toISOString() }).then(setRecent);
      allEntryDates().then((d) => setCount(d.length));
    }, []),
  );

  return (
    <Screen>
      <Row style={{ flexWrap: 'nowrap', gap: space.m }}>
        <Mascot size={88} expression="happy" growth={Math.min(1, count / 100)} />
        <View style={{ flex: 1 }}>
          <T v="title">{settings.mascotName}</T>
          <T v="muted">{count ? `Birlikte ${count} sayfa biriktirdik. Filizim de seninle büyüyor.` : 'Seni tanımak için sabırsızlanıyorum.'}</T>
        </View>
      </Row>

      <Gap h={space.l} />
      <T v="heading">Hayatındaki insanlar</T>
      <T v="small">Sadece “tam analiz” sayfalarından hatırlanır.</T>
      <Gap h={space.s} />
      {people.length === 0 ? (
        <T v="muted">Sayfalarında birinden bahsettiğinde burada görünecek.</T>
      ) : (
        <Row>
          {people.slice(0, 24).map((p) => (
            <Chip key={p.id} label={`${p.name} · ${p.mentionCount}`} onPress={() => router.push(`/person/${p.id}`)} />
          ))}
        </Row>
      )}
      {places.length > 0 ? (
        <>
          <Gap />
          <T v="heading">Yerler</T>
          <Gap h={space.s} />
          <Row>
            {places.slice(0, 16).map((p) => (
              <Chip key={p.id} label={`📍 ${p.name}`} onPress={() => router.push(`/person/${p.id}`)} />
            ))}
          </Row>
        </>
      ) : null}

      {settings.showMoodChart ? (
        <>
          <Gap h={space.l} />
          <T v="heading">Ruh hali eğrisi</T>
          <T v="small">Son iki ay, haftalık ortalama. Sadece bir görselleştirme; bir yorum ya da değerlendirme değil.</T>
          <Gap h={space.s} />
          <Card>
            <MoodChart points={moodSeries(recent, 'week')} />
          </Card>
        </>
      ) : null}

      <Gap h={space.l} />
      <View style={{ gap: space.s }}>
        <Card onPress={() => router.push('/letters')}>
          <T v="heading">✉️ Geleceğe mektup</T>
          <T v="muted">Bugünden gelecekteki kendine yaz, zamanı gelince açılsın.</T>
        </Card>
        <Card onPress={() => router.push('/summary')}>
          <T v="heading">📜 Dönem mektubu</T>
          <T v="muted">{settings.mascotName}, bu hafta ya da bu ay yazdıklarından sana bir mektup yazsın.</T>
        </Card>
        <Card onPress={() => router.push('/settings')}>
          <T v="heading">⚙️ Ayarlar ve gizlilik</T>
          <T v="muted">Maskotun tonu, yapay zekâ izinleri, verilerini silme.</T>
        </Card>
      </View>
    </Screen>
  );
}
