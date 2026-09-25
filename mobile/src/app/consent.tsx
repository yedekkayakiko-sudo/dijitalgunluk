import { router } from 'expo-router';
import { useState } from 'react';
import { Alert } from 'react-native';
import { ConsentChecks } from '@/components/ConsentChecks';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Gap, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { forgetAllNotes } from '@/lib/memory';
import { CONSENT_VERSION, hasValidConsent, useSettings } from '@/lib/settings';
import { space } from '@/theme';

export default function Consent() {
  const { settings, update } = useSettings();
  const given = hasValidConsent(settings);
  const [special, setSpecial] = useState(given);
  const [transfer, setTransfer] = useState(given);

  const accept = async () => {
    await update({ consent: { version: CONSENT_VERSION, at: new Date().toISOString(), special, transfer }, aiEnabled: true });
    track('ai_enabled');
    router.back();
  };

  const withdraw = () =>
    Alert.alert('Rızanı geri al', 'Yapay zekâ kapanır ve hiçbir sayfa artık gönderilmez. Maskotun seninle ilgili notlarını da silmek ister misin?', [
      { text: 'Vazgeç', style: 'cancel' },
      { text: 'Sadece kapat', onPress: async () => { await update({ consent: null, aiEnabled: false }); router.back(); } },
      { text: 'Kapat ve notları sil', style: 'destructive', onPress: async () => { await forgetAllNotes(); await update({ consent: null, aiEnabled: false }); router.back(); } },
    ]);

  return (
    <Screen>
      <MascotBubble text="Seni daha iyi tanıyıp gerçekten sohbet edebilmem için yapay zekâ gerekiyor. Ama önce neyin nereye gittiğini açıkça bilmelisin." size={60} />
      <Gap />
      <Card style={{ gap: space.s }}>
        <T v="body">• Sadece izin verdiğin sayfalar ve mesajlar gönderilir; “sadece ben” sayfaları asla.</T>
        <T v="body">• Adın, telefon ve kimlik numaraları gibi bilgiler gönderilmeden önce gizlenir.</T>
        <T v="body">• Sunucumuz hiçbir metni saklamaz; yanıtları Anthropic’in Claude modeli üretir ve verini model eğitiminde kullanmaz.</T>
        <T v="body">• İstediğin an buradan geri alabilirsin.</T>
        <Button label="Aydınlatma metninin tamamı" kind="ghost" small onPress={() => router.push('/kvkk')} />
      </Card>
      <Gap />
      <ConsentChecks special={special} transfer={transfer} onChange={(v) => { setSpecial(v.special); setTransfer(v.transfer); }} />
      <Gap h={space.l} />
      <Button label={given ? 'Onaylı ✓' : 'Onaylıyorum, yapay zekâyı aç'} onPress={accept} disabled={!special || !transfer || given} />
      {given ? (
        <>
          <Gap h={space.s} />
          <Button label="Rızamı geri al" kind="danger" onPress={withdraw} />
        </>
      ) : null}
    </Screen>
  );
}
