import { moodSeries, STAGES, type Entity } from '@gunluk/core';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { MoodChart } from '@/components/MoodChart';
import { Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { allEntryDates, listEntities, listEntries, type StoredEntry } from '@/lib/db';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const LINKS: { href: Href; icon: string; title: string; body: string }[] = [
  { href: '/goals', icon: '🎯', title: 'Hedef zinciri', body: 'Bir hedef koy, zamanı gelince birlikte bakalım, sonrakini bağlayalım.' },
  { href: '/letters', icon: '✉️', title: 'Geleceğe mektup', body: 'Bugünden gelecekteki kendine yaz; zamanı gelince açılsın.' },
  { href: '/summary', icon: '📜', title: 'Dönem mektubu', body: 'Bu hafta ya da bu ay yazdıklarından sana bir mektup.' },
  { href: '/memory', icon: '🧠', title: 'Beni nasıl tanıyor?', body: 'Hatırladığı her şeyi gör, düzelt ya da sil.' },
  { href: '/breathe', icon: '🫁', title: 'Birlikte nefes', body: 'Bir dakikalık sakinleşme molası.' },
  { href: '/backup', icon: '🔐', title: 'Yedekleme', body: 'Günlüğünü şifreli bir dosyaya al; telefon değişse de kaybolmasın.' },
  { href: '/settings', icon: '⚙️', title: 'Ayarlar ve gizlilik', body: 'Ton, hatırlatmalar, yapay zekâ izinleri, verilerini silme.' },
];

export default function Me() {
  const c = useColors();
  const { settings } = useSettings();
  const { pet, info } = usePet();
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
        <Mascot size={92} expression="happy" stage={info.index} aged={info.aged} />
        <View style={{ flex: 1, gap: 2 }}>
          <T v="title">{settings.mascotName}</T>
          <T v="muted">
            {info.stage.name}
            {info.age ? ` · ${info.age.label}` : ''}
          </T>
          <T v="small">{count ? `Birlikte ${count} sayfa, ${pet.xp} damla.` : 'Seni tanımak için sabırsızlanıyorum.'}</T>
        </View>
      </Row>
      <Gap h={space.s} />
      <Row gap={4}>
        {STAGES.map((s, i) => (
          <View key={s.id} style={{ flex: 1, height: 6, borderRadius: 3, backgroundColor: i <= info.index ? '#86BD6F' : c.sunken }} accessibilityLabel={s.name} />
        ))}
      </Row>

      <Gap h={space.l} />
      <View style={{ gap: space.s }}>
        {LINKS.map((l) => (
          <Card key={l.title} onPress={() => router.push(l.href)} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <T v="body" style={{ fontSize: 24 }}>{l.icon}</T>
            <View style={{ flex: 1 }}>
              <T v="heading">{l.title}</T>
              <T v="muted">{l.body}</T>
            </View>
          </Card>
        ))}
      </View>

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
    </Screen>
  );
}
