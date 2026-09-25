import { useState, type ReactNode } from 'react';
import { Pressable, Switch, TextInput, View } from 'react-native';
import { Mascot, type Expression } from '@/components/Mascot';
import { MascotBubble } from '@/components/MascotBubble';
import { Button, Card, Gap, Row, Screen, T } from '@/components/ui';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';
import { TonePicker } from '@/components/TonePicker';

export default function Onboarding() {
  const c = useColors();
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const [adult, setAdult] = useState(false);

  const input = {
    backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 12, padding: 12, color: c.text, fontSize: 17,
  } as const;

  const steps: { expression: Expression; say: string; body: ReactNode; next?: string; canNext?: boolean }[] = [
    {
      expression: 'happy',
      say: 'Merhaba! Ben senin günlük arkadaşınım. Sen yazdıkça seni daha iyi tanıyacağım.',
      body: (
        <T v="muted">
          Burası klasik bir not uygulaması değil. Sayfaların sende kalır, ben sadece hatırlamana ve bazen biraz daha yazmana yardım ederim. Çoğu zaman da sessizce dinlerim.
        </T>
      ),
      next: 'Tanışalım',
    },
    {
      expression: 'curious',
      say: 'Sana nasıl hitap edeyim? Bir de bana bir isim verir misin?',
      body: (
        <View style={{ gap: space.m }}>
          <TextInput value={settings.userName} onChangeText={(userName) => update({ userName })} placeholder="Adın (isteğe bağlı)" placeholderTextColor={c.muted} style={input} />
          <TextInput value={settings.mascotName} onChangeText={(mascotName) => update({ mascotName })} placeholder="Maskotun adı" placeholderTextColor={c.muted} style={input} />
        </View>
      ),
      canNext: settings.mascotName.trim().length > 0,
    },
    {
      expression: 'idle',
      say: 'Nasıl konuşmamı istersin?',
      body: <TonePicker value={settings.tone} onChange={(tone) => update({ tone })} />,
    },
    {
      expression: 'caring',
      say: 'Gizliliğin benim için her şeyden önemli.',
      body: (
        <View style={{ gap: space.m }}>
          <Card style={{ gap: space.s }}>
            <T v="body">🔐 Sayfaların sadece bu telefonda, şifreli olarak saklanır.</T>
            <T v="body">🧭 Sana asla teşhis koymam; sadece gözlemlerimi paylaşır, soru sorarım.</T>
            <T v="body">🗑 İstediğin sayfayı ya da her şeyi kalıcı olarak silebilirsin.</T>
          </Card>
          <Card style={{ gap: space.s }}>
            <Row style={{ justifyContent: 'space-between', flexWrap: 'nowrap' }}>
              <T v="heading" style={{ flex: 1 }}>Yapay zekâ ile daha iyi hatırla</T>
              <Switch value={settings.aiEnabled} onValueChange={(aiEnabled) => update({ aiEnabled })} />
            </Row>
            <T v="small">
              İsteğe bağlı. Açarsan, izin verdiğin sayfalar yanıt üretmek için Anthropic’in Claude modeline gönderilir; saklanmaz ve model eğitiminde kullanılmaz.
              Her sayfada “sadece ben” seçeneğiyle bunu engelleyebilirsin. Sonradan ayarlardan değiştirebilirsin.
            </T>
          </Card>
          <Pressable onPress={() => setAdult((a) => !a)} accessibilityRole="checkbox" accessibilityState={{ checked: adult }}>
            <Row style={{ flexWrap: 'nowrap' }}>
              <View style={{ width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: c.accent, backgroundColor: adult ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
                {adult ? <T v="small" style={{ color: c.accentText, fontWeight: '800' }}>✓</T> : null}
              </View>
              <T v="body" style={{ flex: 1 }}>18 yaşından büyüğüm ve bu uygulamanın bir sağlık hizmeti olmadığını biliyorum.</T>
            </Row>
          </Pressable>
        </View>
      ),
      next: 'Başlayalım',
      canNext: adult,
    },
  ];

  const s = steps[step];
  const last = step === steps.length - 1;

  return (
    <Screen>
      <Gap h={space.l} />
      <View style={{ alignItems: 'center' }}>
        <Mascot size={140} expression={s.expression} growth={step / 4} />
      </View>
      <Gap />
      <MascotBubble text={s.say} showMascot={false} />
      <Gap />
      {s.body}
      <Gap h={space.l} />
      <Button
        label={s.next ?? 'Devam'}
        disabled={s.canNext === false}
        onPress={() => (last ? update({ onboarded: true }) : setStep(step + 1))}
      />
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
