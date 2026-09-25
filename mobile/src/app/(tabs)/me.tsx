import { moodSeries, type Entity } from '@gunluk/core';
import { router, useFocusEffect, type Href } from 'expo-router';
import { useCallback, useState } from 'react';
import { View } from 'react-native';
import { Icon, type IconName } from '@/components/Icon';
import { Mascot } from '@/components/Mascot';
import { MoodChart } from '@/components/MoodChart';
import { Card, Chip, Gap, Label, Progress, Row, Screen, T } from '@/components/ui';
import { allEntryDates, listEntities, listEntries, type StoredEntry } from '@/lib/db';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const LINKS: { href: Href; icon: IconName; title: string; body: string }[] = [
  { href: '/shelf', icon: 'shelf', title: 'Anı rafı', body: 'Her sayfanın bıraktığı küçük anılar, ay ay.' },
  { href: '/goals', icon: 'target', title: 'Hedef zinciri', body: 'Bir hedef koy, zamanı gelince birlikte bakalım, sonrakini bağlayalım.' },
  { href: '/letters', icon: 'letter', title: 'Geleceğe mektup', body: 'Bugünden gelecekteki kendine yaz; zamanı gelince açılsın.' },
  { href: '/summary', icon: 'pen', title: 'Dönem mektubu', body: 'Bu hafta ya da bu ay yazdıklarından sana bir mektup.' },
  { href: '/memory', icon: 'spark', title: 'Beni nasıl tanıyor?', body: 'Hatırladığı her şeyi gör, düzelt ya da sil.' },
  { href: '/breathe', icon: 'breath', title: 'Birlikte nefes', body: 'Bir dakikalık sakinleşme molası.' },
  { href: '/backup', icon: 'lock', title: 'Yedekleme', body: 'Günlüğünü şifreli bir dosyaya al; telefon değişse de kaybolmasın.' },
  { href: '/settings', icon: 'me', title: 'Ayarlar ve gizlilik', body: 'Ton, hatırlatmalar, yapay zekâ izinleri, verilerini silme.' },
];

export default function Me() {
  const c = useColors();
  const { settings } = useSettings();
  const { info, traits } = usePet();
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
      <Card onPress={() => router.push('/bond')} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
        <Mascot size={92} expression="happy" look={info.look} />
        <View style={{ flex: 1, gap: 4 }}>
          <T v="title" style={{ fontSize: 24 }}>{settings.mascotName}</T>
          <T v="small">Seviye {info.level} · {info.chapter.name}{info.age ? ` · ${info.age.label}` : ''}</T>
          <Progress value={info.progress} height={5} />
          <T v="small">{count ? `Birlikte ${count} sayfa${traits[0] ? ` · ${traits[0].glyph} ${traits[0].label}` : ''}` : 'Seni tanımak için sabırsızlanıyorum.'}</T>
        </View>
        <Icon name="chevron" color={c.muted} size={18} />
      </Card>
      <Gap h={space.l} />
      <View style={{ gap: space.s }}>
        {LINKS.map((l) => (
          <Card key={l.title} onPress={() => router.push(l.href)} style={{ flexDirection: 'row', gap: space.m, alignItems: 'center' }}>
            <Icon name={l.icon} color={c.accent} />
            <View style={{ flex: 1 }}>
              <T v="heading">{l.title}</T>
              <T v="muted">{l.body}</T>
            </View>
          </Card>
        ))}
      </View>

      <Gap h={space.l} />
      <Label>Hayatındaki insanlar</Label>
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
          <Label>Yerler</Label>
          <Gap h={space.s} />
          <Row>
            {places.slice(0, 16).map((p) => (
              <Chip key={p.id} label={p.name} onPress={() => router.push(`/person/${p.id}`)} />
            ))}
          </Row>
        </>
      ) : null}

      {settings.showMoodChart ? (
        <>
          <Gap h={space.l} />
          <Label>Ruh hali eğrisi</Label>
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
