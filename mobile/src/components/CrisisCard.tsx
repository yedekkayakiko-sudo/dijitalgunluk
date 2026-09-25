import { CRISIS_RESOURCES, CRISIS_TEXT, type CrisisLevel } from '@gunluk/core';
import { Linking, View } from 'react-native';
import { space, useColors } from '@/theme';
import { Mascot } from './Mascot';
import { Button, Card, T } from './ui';

/**
 * Shown whenever a crisis signal is detected. Calm, direct, never minimising,
 * with one-tap calls. Wording is fixed on-device (never AI-generated).
 */
export function CrisisCard({ level }: { level: Exclude<CrisisLevel, 'none'> }) {
  const c = useColors();
  return (
    <Card style={{ borderColor: c.accent, borderWidth: 1.5, gap: space.m }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: space.s }}>
        <Mascot size={56} expression="caring" />
        <T v="heading" style={{ flex: 1 }}>Yanındayım</T>
      </View>
      <T v="body">{CRISIS_TEXT[level]}</T>
      {CRISIS_RESOURCES.map((r) => (
        <View key={r.label} style={{ gap: 6 }}>
          <T v="heading" style={{ fontSize: 15 }}>{r.label}</T>
          <T v="muted">{r.note}</T>
          {r.phone ? <Button label={`${r.phone} ara`} onPress={() => Linking.openURL(`tel:${r.phone}`)} small kind={r.phone === '112' ? 'primary' : 'secondary'} /> : null}
        </View>
      ))}
      <T v="small">Bu uygulama bir sağlık hizmeti değildir ve acil durumlarda profesyonel desteğin yerini tutmaz.</T>
    </Card>
  );
}
