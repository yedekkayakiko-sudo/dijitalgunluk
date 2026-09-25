import type { MascotTone } from '@gunluk/core';
import { View } from 'react-native';
import { space, useColors } from '@/theme';
import { Card, T } from './ui';

export const TONES: { value: MascotTone; label: string; sample: string }[] = [
  { value: 'calm', label: 'Sakin ve bilge', sample: 'Bugün biraz hızlı geçmiş gibi. Anlatmak istersen buradayım.' },
  { value: 'energetic', label: 'Enerjik ve samimi', sample: 'Bugün hızlı geçmiş gibi! Aklında kalan tek bir an ne olurdu?' },
  { value: 'minimal', label: 'Minimal ve sessiz', sample: 'Kısa ve öz. Eklemek istersen buradayım.' },
];

export function TonePicker({ value, onChange }: { value: MascotTone; onChange: (t: MascotTone) => void }) {
  const c = useColors();
  return (
    <View style={{ gap: space.s }}>
      {TONES.map((t) => (
        <Card key={t.value} onPress={() => onChange(t.value)} style={{ borderColor: value === t.value ? c.accent : c.border, borderWidth: value === t.value ? 2 : 1, gap: 4 }}>
          <T v="heading">{t.label}</T>
          <T v="muted">“{t.sample}”</T>
        </Card>
      ))}
    </View>
  );
}
