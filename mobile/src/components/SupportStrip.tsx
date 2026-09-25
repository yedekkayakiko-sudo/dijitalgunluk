import { CRISIS_RESOURCES } from '@gunluk/core';
import { router } from 'expo-router';
import { Linking, Pressable, View } from 'react-native';
import { space, useColors } from '@/theme';
import { T } from './ui';

/*
 * A quiet row of support, shown under the mascot's reply only when someone
 * explicitly writes about ending their life or hurting themselves. It never
 * replaces the conversation; the mascot keeps talking like a friend.
 */
export function SupportStrip() {
  const c = useColors();
  const chip = (label: string, onPress: () => void, strong = false) => (
    <Pressable
      key={label}
      onPress={onPress}
      accessibilityRole="button"
      style={{ paddingVertical: 7, paddingHorizontal: 12, borderRadius: 999, backgroundColor: strong ? c.accent : c.card, borderWidth: 1, borderColor: strong ? c.accent : c.border }}>
      <T v="small" style={{ color: strong ? c.accentText : c.text, fontWeight: '700' }}>{label}</T>
    </Pressable>
  );
  return (
    <View style={{ backgroundColor: c.sunken, borderRadius: 14, padding: space.s, gap: space.s }} accessibilityLabel="Destek seçenekleri">
      <T v="small">Yalnız değilsin. İstersen hemen birine ulaşabilirsin:</T>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: space.xs }}>
        {CRISIS_RESOURCES.filter((r) => r.phone).map((r) => chip(`📞 ${r.phone}`, () => Linking.openURL(`tel:${r.phone}`), r.phone === '112'))}
        {chip('🫁 Birlikte nefes', () => router.push('/breathe'))}
        {chip('Diğer destekler', () => router.push('/privacy'))}
      </View>
    </View>
  );
}
