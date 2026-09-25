import { MOODS, type Mood, type PrivacyLevel } from '@gunluk/core';
import { Pressable, Text, View } from 'react-native';
import { space, useColors } from '@/theme';
import { Chip, Row, T } from './ui';

export function MoodPicker({ value, onChange }: { value: Mood | null; onChange: (m: Mood | null) => void }) {
  const c = useColors();
  return (
    <Row gap={space.xs} style={{ flexWrap: 'nowrap', justifyContent: 'space-around' }}>
      {MOODS.map((m) => {
        const selected = value === m.value;
        return (
          <Pressable
            key={m.value}
            onPress={() => onChange(selected ? null : m.value)}
            accessibilityRole="button"
            accessibilityLabel={`Ruh hali: ${m.label}`}
            accessibilityState={{ selected }}
            style={{ alignItems: 'center', padding: 6, borderRadius: 14, backgroundColor: selected ? c.accentSoft : 'transparent', minWidth: 52 }}>
            <Text style={{ fontSize: selected ? 30 : 24, opacity: value && !selected ? 0.45 : 1 }}>{m.emoji}</Text>
            <T v="small" style={{ fontSize: 11 }}>{m.label}</T>
          </Pressable>
        );
      })}
    </Row>
  );
}

export const PRIVACY: Record<PrivacyLevel, { label: string; icon: string; help: string }> = {
  private: { label: 'Sadece ben', icon: '🔒', help: 'Hiçbir şekilde sunucuya gönderilmez, maskot bu sayfayı okumaz.' },
  ai_read: { label: 'Görsün, analiz etmesin', icon: '👁', help: 'Sorduğunda hatırlamak için okuyabilir; kişi, tema ya da tepki çıkarmaz.' },
  ai_full: { label: 'Tam analiz', icon: '✨', help: 'Maskot bu sayfadan kişileri ve temaları hatırlar, bazen yorum yapar.' },
};

export function PrivacyPicker({ value, onChange, showHelp = true }: { value: PrivacyLevel; onChange: (p: PrivacyLevel) => void; showHelp?: boolean }) {
  return (
    <View style={{ gap: space.s }}>
      <Row>
        {(Object.keys(PRIVACY) as PrivacyLevel[]).map((p) => (
          <Chip key={p} label={`${PRIVACY[p].icon} ${PRIVACY[p].label}`} selected={value === p} onPress={() => onChange(p)} />
        ))}
      </Row>
      {showHelp ? <T v="small">{PRIVACY[value].help}</T> : null}
    </View>
  );
}

export const WEATHER = ['☀️ Güneşli', '⛅ Parçalı', '☁️ Bulutlu', '🌧 Yağmurlu', '❄️ Karlı', '🌬 Rüzgârlı'];
