import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { PrivacyPicker } from '@/components/pickers';
import { TonePicker } from '@/components/TonePicker';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { api } from '@/lib/api';
import { clearDraft, wipeAll } from '@/lib/db';
import { deleteAllPhotos } from '@/lib/photos';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

function Field({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (s: string) => void; placeholder?: string }) {
  const c = useColors();
  return (
    <View style={{ gap: 4 }}>
      <T v="small">{label}</T>
      <TextInput
        value={value}
        onChangeText={onChange}
        placeholder={placeholder}
        placeholderTextColor={c.muted}
        autoCapitalize="none"
        style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 16 }}
      />
    </View>
  );
}

export default function SettingsScreen() {
  const { settings, update, reset } = useSettings();
  const [serverStatus, setServerStatus] = useState<string | null>(null);

  const testServer = async () => {
    setServerStatus('Bağlanıyor…');
    const h = await api.health(settings.serverUrl);
    setServerStatus(!h ? 'Sunucuya ulaşılamadı.' : h.ai ? `Bağlandı. Yapay zekâ hazır${h.embeddings ? ', anlamsal arama açık' : ''}.` : 'Bağlandı ama sunucuda yapay zekâ anahtarı yok.');
  };

  const forgetAll = () =>
    Alert.alert('Her şey silinsin mi?', 'Tüm sayfaların, fotoğrafların, mektupların ve maskotun hatırladığı her şey bu cihazdan kalıcı olarak silinir. Geri alınamaz.', [
      { text: 'Vazgeç', style: 'cancel' },
      {
        text: 'Devam', style: 'destructive',
        onPress: () =>
          Alert.alert('Emin misin?', 'Bu son onay.', [
            { text: 'Vazgeç', style: 'cancel' },
            {
              text: 'Hepsini kalıcı olarak sil', style: 'destructive',
              onPress: async () => {
                await clearDraft();
                await wipeAll();
                deleteAllPhotos();
                reset();
                router.replace('/onboarding');
              },
            },
          ]),
      },
    ]);

  return (
    <Screen>
      <T v="heading">Sen ve maskotun</T>
      <Gap h={space.s} />
      <Field label="Sana nasıl hitap edelim?" value={settings.userName} onChange={(userName) => update({ userName })} placeholder="Adın (isteğe bağlı)" />
      <Gap h={space.s} />
      <Field label="Maskotunun adı" value={settings.mascotName} onChange={(mascotName) => update({ mascotName })} />
      <Gap />
      <Row style={{ flexWrap: 'nowrap' }}>
        <Mascot size={56} />
        <T v="heading" style={{ flex: 1 }}>Konuşma tonu</T>
      </Row>
      <Gap h={space.s} />
      <TonePicker value={settings.tone} onChange={(tone) => update({ tone })} />

      <Gap h={space.l} />
      <T v="heading">Yapay zekâ</T>
      <Gap h={space.s} />
      <Card style={{ gap: space.s }}>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T v="body" style={{ flex: 1 }}>Maskot yapay zekâ kullanabilir</T>
          <Switch value={settings.aiEnabled} onValueChange={(aiEnabled) => update({ aiEnabled })} />
        </Row>
        <T v="small">
          Kapalıyken hiçbir sayfa cihazından çıkmaz; maskot sadece cihaz içi kurallarla çalışır. Açıkken, izin verdiğin sayfalar yanıt üretmek için
          sunucumuza ve oradan Anthropic’in Claude modeline gönderilir, saklanmaz ve model eğitiminde kullanılmaz.
        </T>
        <Button label="Ayrıntılı gizlilik bilgisi" kind="ghost" small onPress={() => router.push('/privacy')} />
      </Card>
      <Gap h={space.s} />
      <T v="small">Yeni sayfalar için varsayılan gizlilik</T>
      <Gap h={space.xs} />
      <PrivacyPicker value={settings.defaultPrivacy} onChange={(defaultPrivacy) => update({ defaultPrivacy })} />

      <Gap h={space.l} />
      <T v="heading">Görünüm</T>
      <Gap h={space.s} />
      <Card>
        <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
          <T v="body" style={{ flex: 1 }}>Ruh hali eğrisini göster</T>
          <Switch value={settings.showMoodChart} onValueChange={(showMoodChart) => update({ showMoodChart })} />
        </Row>
      </Card>

      <Gap h={space.l} />
      <T v="heading">Gelişmiş</T>
      <Gap h={space.s} />
      <Field label="Sunucu adresi" value={settings.serverUrl} onChange={(serverUrl) => update({ serverUrl })} placeholder="https://..." />
      <Gap h={space.xs} />
      <Row>
        <Button label="Bağlantıyı test et" kind="secondary" small onPress={testServer} disabled={!settings.serverUrl} />
        {serverStatus ? <T v="small">{serverStatus}</T> : null}
      </Row>

      <Gap h={space.l} />
      <T v="heading">Unutulma hakkı</T>
      <Gap h={space.s} />
      <T v="muted">Tek bir sayfayı, sayfanın içinden silebilirsin. Buradan ise her şeyi kalıcı olarak silebilirsin.</T>
      <Gap h={space.s} />
      <Button label="Tüm verilerimi kalıcı olarak sil" kind="danger" onPress={forgetAll} />
    </Screen>
  );
}
