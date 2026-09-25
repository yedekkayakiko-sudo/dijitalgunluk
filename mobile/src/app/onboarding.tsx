import { STAGES } from '@gunluk/core';
import { router } from 'expo-router';
import { useState, type ReactNode } from 'react';
import { Alert, Switch, TextInput, View } from 'react-native';
import { Check, ConsentChecks } from '@/components/ConsentChecks';
import { Mascot, type Expression } from '@/components/Mascot';
import { MascotBubble } from '@/components/MascotBubble';
import { TonePicker } from '@/components/TonePicker';
import { Button, Card, Chip, Gap, Row, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { newId } from '@/lib/db';
import { saveNotes, type MemoryNote, type NoteCategory } from '@/lib/memory';
import { askPermission } from '@/lib/notifications';
import { CONSENT_VERSION, useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';

const REMINDERS = [null, '09:00', '21:00', '22:30'] as const;

export default function Onboarding() {
  const c = useColors();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);
  const [ai, setAi] = useState(false);
  const [consent, setConsent] = useState({ special: false, transfer: false });
  const [reminder, setReminder] = useState<string | null>('21:00');
  const [about, setAbout] = useState({ people: '', helps: '', now: '' });

  const input = { backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 17 } as const;

  const finish = async () => {
    // What the user shared about themselves becomes the mascot's first memory notes.
    const answers: [NoteCategory, string, string][] = [
      ['kisi', 'Hayatındaki önemli insanlar', about.people],
      ['iyi_gelen', 'Ona iyi gelenler', about.helps],
      ['durum', 'Şu sıralar', about.now],
    ];
    const seed: MemoryNote[] = answers
      .filter(([, , value]) => value.trim())
      .map(([category, label, value]) => ({ id: newId(), category, text: `${label}: ${value.trim()}`, pinned: true }));
    if (seed.length) await saveNotes(seed);
    let reminderTime = reminder;
    if (reminderTime && !(await askPermission())) reminderTime = null;
    await update({
      onboarded: true,
      reminderTime,
      aiEnabled: ai && consent.special && consent.transfer,
      consent: ai && consent.special && consent.transfer ? { version: CONSENT_VERSION, at: new Date().toISOString(), ...consent } : null,
    });
    track('onboarding_done', { ai, reminder: !!reminderTime });
    if (ai) track('ai_enabled');
  };

  const steps: { expression: Expression; stage: number; say: string; body: ReactNode; next?: string; canNext?: boolean; onNext?: () => void }[] = [
    {
      expression: 'happy',
      stage: 0,
      say: 'Merhaba! Ben minicik bir tohumum. Sen yazdıkça büyüyeceğim, seni tanıdıkça da senin dostun olacağım.',
      body: (
        <View style={{ gap: space.m }}>
          <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
            {[0, 2, 4, 6].map((i) => (
              <View key={i} style={{ alignItems: 'center' }}>
                <Mascot size={54} stage={i} breathing={false} expression={i === 6 ? 'happy' : 'idle'} />
                <T v="small" style={{ fontSize: 11 }}>{STAGES[i].name}</T>
              </View>
            ))}
          </Row>
          <T v="muted">
            Burası klasik bir not uygulaması değil. Her sayfan bana su olur, ben de büyürüm. Sayfaların sende kalır; ben hatırlamana, zor günlerde yanında olmana ve bazen biraz daha yazmana yardım ederim.
          </T>
        </View>
      ),
      next: 'Tanışalım',
    },
    {
      expression: 'curious',
      stage: 1,
      say: 'Sana nasıl hitap edeyim? Bir de bana bir isim verir misin?',
      body: (
        <View style={{ gap: space.m }}>
          <TextInput value={settings.userName} onChangeText={(userName) => update({ userName })} placeholder="Adın (isteğe bağlı)" placeholderTextColor={c.muted} style={input} />
          <TextInput value={settings.mascotName} onChangeText={(mascotName) => update({ mascotName })} placeholder="Maskotun adı" placeholderTextColor={c.muted} style={input} maxLength={24} />
          <T v="small">Adın hiçbir zaman cihazından çıkmaz.</T>
        </View>
      ),
      canNext: settings.mascotName.trim().length > 0,
    },
    {
      expression: 'love',
      stage: 1,
      say: 'Seni biraz tanıyayım mı? İstediğini cevapla, istediğini boş bırak. Sadece bu telefonda kalır.',
      body: (
        <View style={{ gap: space.m }}>
          <View style={{ gap: 4 }}>
            <T v="small">Hayatındaki en önemli insanlardan biri kim?</T>
            <TextInput value={about.people} onChangeText={(people) => setAbout((a) => ({ ...a, people }))} placeholder="ör. ablam Elif, en yakın arkadaşım Can" placeholderTextColor={c.muted} style={input} maxLength={120} />
          </View>
          <View style={{ gap: 4 }}>
            <T v="small">Sana ne iyi gelir?</T>
            <TextInput value={about.helps} onChangeText={(helps) => setAbout((a) => ({ ...a, helps }))} placeholder="ör. akşam yürüyüşleri, müzik, kedimle oynamak" placeholderTextColor={c.muted} style={input} maxLength={120} />
          </View>
          <View style={{ gap: 4 }}>
            <T v="small">Şu sıralar hayatında neler oluyor?</T>
            <TextInput value={about.now} onChangeText={(now) => setAbout((a) => ({ ...a, now }))} placeholder="ör. yeni işe başladım, sınavlara hazırlanıyorum" placeholderTextColor={c.muted} style={input} maxLength={160} />
          </View>
        </View>
      ),
      next: about.people || about.helps || about.now ? 'Devam' : 'Şimdilik geç',
    },
    {
      expression: 'idle',
      stage: 2,
      say: 'Nasıl konuşmamı istersin?',
      body: <TonePicker value={settings.tone} onChange={(tone) => update({ tone })} />,
    },
    {
      expression: 'caring',
      stage: 2,
      say: 'Gizliliğin benim için her şeyden önemli.',
      body: (
        <View style={{ gap: space.m }}>
          <Card style={{ gap: space.s }}>
            <T v="body">🔐 Sayfaların sadece bu telefonda, şifreli olarak saklanır.</T>
            <T v="body">🧭 Sana asla teşhis koymam; bir dost gibi dinlerim.</T>
            <T v="body">🗑 İstediğin sayfayı ya da her şeyi kalıcı olarak silebilirsin.</T>
          </Card>
          <Card style={{ gap: space.m }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}>
                <T v="heading">Beni gerçekten tanı</T>
                <T v="small">Sohbet, hatırlama ve sana özel yanıtlar için yapay zekâ. İsteğe bağlı, sonradan da açabilirsin.</T>
              </View>
              <Switch value={ai} onValueChange={setAi} />
            </Row>
            {ai ? (
              <>
                <ConsentChecks special={consent.special} transfer={consent.transfer} onChange={setConsent} />
                <Button label="Aydınlatma metnini oku" kind="ghost" small onPress={() => router.push('/kvkk-intro')} />
              </>
            ) : null}
          </Card>
          <Card>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <View style={{ flex: 1 }}>
                <T v="body">Anonim kullanım istatistikleri</T>
                <T v="small">Metin ya da kimlik yok; sadece sayılar. Uygulamayı geliştirmemize yardım eder.</T>
              </View>
              <Switch value={settings.analytics} onValueChange={(analytics) => update({ analytics })} />
            </Row>
          </Card>
        </View>
      ),
      canNext: !ai || (consent.special && consent.transfer),
    },
    {
      expression: 'happy',
      stage: 4,
      say: 'Son bir şey: günde bir kez nazikçe hatırlatayım mı? Yazmadığın günler için asla sitem etmem.',
      body: (
        <View style={{ gap: space.m }}>
          <Row>
            {REMINDERS.map((t) => (
              <Chip key={t ?? 'off'} label={t ?? 'Hatırlatma istemiyorum'} selected={reminder === t} onPress={() => setReminder(t)} />
            ))}
          </Row>
          <Check checked={adult} onPress={() => setAdult((a) => !a)} text="18 yaşından büyüğüm ve bu uygulamanın bir sağlık hizmeti olmadığını, zor anlarda profesyonel desteğin yerini tutmadığını biliyorum." />
        </View>
      ),
      next: 'Başlayalım',
      canNext: adult,
      onNext: () => {
        finish().catch(() => Alert.alert('Bir sorun oldu', 'Lütfen tekrar dene.'));
      },
    },
  ];

  const s = steps[step];

  return (
    <Screen>
      <Gap h={space.l} />
      <View style={{ alignItems: 'center' }}>
        <Mascot size={130} expression={s.expression} stage={s.stage} />
      </View>
      <Gap />
      <MascotBubble text={s.say} showMascot={false} />
      <Gap />
      {s.body}
      <Gap h={space.l} />
      <Button label={s.next ?? 'Devam'} disabled={s.canNext === false} onPress={() => (s.onNext ? s.onNext() : setStep(step + 1))} />
      {step > 0 ? <Button label="Geri" kind="ghost" onPress={() => setStep(step - 1)} style={{ marginTop: space.s }} /> : null}
      <Gap />
      <Row style={{ justifyContent: 'center' }}>
        {steps.map((_, i) => (
          <View key={i} style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: i === step ? c.accent : c.border }} />
        ))}
      </Row>
    </Screen>
  );
}
