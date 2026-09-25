import { Pressable, View } from 'react-native';
import { CONSENT_SPECIAL, CONSENT_TRANSFER } from '@/lib/legal';
import { space, useColors } from '@/theme';
import { T } from './ui';

/** The two explicit consents, kept separate as KVKK expects. */
export function ConsentChecks({ special, transfer, onChange }: { special: boolean; transfer: boolean; onChange: (v: { special: boolean; transfer: boolean }) => void }) {
  return (
    <View style={{ gap: space.m }}>
      <Check checked={special} onPress={() => onChange({ special: !special, transfer })} text={CONSENT_SPECIAL} />
      <Check checked={transfer} onPress={() => onChange({ special, transfer: !transfer })} text={CONSENT_TRANSFER} />
    </View>
  );
}

export function Check({ checked, onPress, text }: { checked: boolean; onPress: () => void; text: string }) {
  const c = useColors();
  return (
    <Pressable onPress={onPress} accessibilityRole="checkbox" accessibilityState={{ checked }} style={{ flexDirection: 'row', gap: space.s }}>
      <View style={{ width: 24, height: 24, marginTop: 2, borderRadius: 6, borderWidth: 2, borderColor: c.accent, backgroundColor: checked ? c.accent : 'transparent', alignItems: 'center', justifyContent: 'center' }}>
        {checked ? <T v="small" style={{ color: c.accentText, fontWeight: '800' }}>✓</T> : null}
      </View>
      <T v="small" style={{ flex: 1, color: c.text }}>{text}</T>
    </Pressable>
  );
}
