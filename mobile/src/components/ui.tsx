import type { ReactNode } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { serif, space, useColors } from '@/theme';

export function Screen({ children, scroll = true, padded = true }: { children: ReactNode; scroll?: boolean; padded?: boolean }) {
  const c = useColors();
  const inner = padded ? { padding: space.m, paddingBottom: space.xl * 2 } : undefined;
  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: c.bg }} edges={['top']}>
      {scroll ? (
        <ScrollView contentContainerStyle={inner} keyboardShouldPersistTaps="handled">
          {children}
        </ScrollView>
      ) : (
        <View style={[{ flex: 1 }, inner]}>{children}</View>
      )}
    </SafeAreaView>
  );
}

type Variant = 'title' | 'heading' | 'body' | 'muted' | 'small' | 'serif';

export function T({ children, v = 'body', style, numberOfLines }: { children: ReactNode; v?: Variant; style?: StyleProp<TextStyle>; numberOfLines?: number }) {
  const c = useColors();
  const base: Record<Variant, TextStyle> = {
    title: { fontFamily: serif, fontSize: 28, lineHeight: 34, color: c.text, fontWeight: '600' },
    heading: { fontSize: 17, lineHeight: 22, color: c.text, fontWeight: '700' },
    body: { fontSize: 16, lineHeight: 23, color: c.text },
    serif: { fontFamily: serif, fontSize: 17, lineHeight: 26, color: c.text },
    muted: { fontSize: 15, lineHeight: 21, color: c.muted },
    small: { fontSize: 13, lineHeight: 18, color: c.muted },
  };
  return (
    <Text style={[base[v], style]} numberOfLines={numberOfLines}>
      {children}
    </Text>
  );
}

export function Card({ children, style, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void }) {
  const c = useColors();
  const s = [styles.card, { backgroundColor: c.card, borderColor: c.border }, style];
  if (!onPress) return <View style={s}>{children}</View>;
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [s, pressed && { opacity: 0.85 }]} accessibilityRole="button">
      {children}
    </Pressable>
  );
}

export function Button({
  label, onPress, kind = 'primary', disabled, style, small,
}: { label: string; onPress: () => void; kind?: 'primary' | 'secondary' | 'ghost' | 'danger'; disabled?: boolean; style?: StyleProp<ViewStyle>; small?: boolean }) {
  const c = useColors();
  const bg = { primary: c.accent, secondary: c.accentSoft, ghost: 'transparent', danger: c.dangerSoft }[kind];
  const fg = { primary: c.accentText, secondary: c.text, ghost: c.accent, danger: c.danger }[kind];
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.button,
        small && styles.buttonSmall,
        { backgroundColor: bg, opacity: disabled ? 0.45 : pressed ? 0.8 : 1 },
        style,
      ]}>
      <Text style={{ color: fg, fontWeight: '700', fontSize: small ? 14 : 16 }}>{label}</Text>
    </Pressable>
  );
}

export function Chip({ label, selected, onPress }: { label: string; selected?: boolean; onPress?: () => void }) {
  const c = useColors();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected }}
      style={[styles.chip, { borderColor: selected ? c.accent : c.border, backgroundColor: selected ? c.accentSoft : c.card }]}>
      <Text style={{ color: c.text, fontSize: 14 }}>{label}</Text>
    </Pressable>
  );
}

export function Row({ children, style, gap = space.s }: { children: ReactNode; style?: StyleProp<ViewStyle>; gap?: number }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: 'wrap' }, style]}>{children}</View>;
}

export function Gap({ h = space.m }: { h?: number }) {
  return <View style={{ height: h }} />;
}

const styles = StyleSheet.create({
  card: { borderRadius: 18, borderWidth: StyleSheet.hairlineWidth, padding: space.m },
  button: { borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' },
  buttonSmall: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 12 },
  chip: { borderRadius: 999, borderWidth: 1, paddingVertical: 7, paddingHorizontal: 13 },
});
