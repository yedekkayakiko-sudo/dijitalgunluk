import { ACCESSORIES, chapterFor, formFor, FORMS } from '@gunluk/core';
import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Animated, Modal, View } from 'react-native';
import { track } from '@/lib/analytics';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space, useColors } from '@/theme';
import { Mascot } from './Mascot';
import { canShare, ShareMascot } from './ShareMascot';
import { Button, Label, T } from './ui';

const WE: Record<string, string> = { Arkadaş: 'arkadaşız', 'Yakın dost': 'yakın dostuz', Sırdaş: 'sırdaşız', 'Can dostu': 'can dostuyuz' };

/**
 * Celebrates a new bond level wherever the user is. A new look gets the big
 * moment; a plain level is a smaller, quieter one.
 */
export function LevelUp() {
  const c = useColors();
  const { settings } = useSettings();
  const { pendingLevel, ackLevel, info, bond } = usePet();
  const [scale] = useState(() => new Animated.Value(0.6));
  const [sharing, setSharing] = useState(false);
  const level = pendingLevel;
  const previous = bond.seenLevel;
  const form = level ? formFor(level) : null;
  const newForm = !!level && !!form && form.id !== formFor(previous).id;
  const newChapter = !!level && chapterFor(level).name !== chapterFor(previous).name;
  const unlocked = level ? ACCESSORIES.filter((a) => a.level > previous && a.level <= level) : [];

  useEffect(() => {
    if (!level) return;
    track('level_up', { level });
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [level, scale]);

  if (!level) return null;
  const close = () => ackLevel(level);
  const title = newForm ? `${settings.mascotName} değişti!` : newChapter ? `Artık ${WE[chapterFor(level).name] ?? chapterFor(level).name}` : `Bağınız güçlendi`;
  const line = newForm ? form!.line : newChapter ? 'Birbirimizi daha iyi tanıyoruz. Bu, yazdığın her sayfanın eseri.' : 'Seni biraz daha tanıdım. Her sayfan beni büyütüyor.';

  return (
    <Modal visible transparent animationType="fade" onRequestClose={close}>
      <View style={{ flex: 1, backgroundColor: '#000A', alignItems: 'center', justifyContent: 'center', padding: space.l }}>
        <View style={{ backgroundColor: c.card, borderRadius: 24, padding: space.l, alignItems: 'center', gap: space.s, width: '100%', maxWidth: 360 }}>
          <Label>Seviye {level} · {chapterFor(level).name}</Label>
          <T v="title" style={{ textAlign: 'center' }}>{title}</T>
          <Animated.View style={{ transform: [{ scale }], marginVertical: space.s }}>
            <Mascot size={160} expression="happy" look={info.look} night={false} />
          </Animated.View>
          {newForm ? <T v="heading">Yeni görünüm: {form!.name}</T> : null}
          <T v="muted" style={{ textAlign: 'center' }}>{line}</T>
          {unlocked.length ? (
            <View style={{ backgroundColor: c.accentSoft, borderRadius: 12, padding: space.s, alignSelf: 'stretch' }}>
              <T v="small" style={{ textAlign: 'center', color: c.text }}>Yeni aksesuar açıldı: {unlocked.map((a) => a.name).join(', ')}</T>
            </View>
          ) : null}
          <Button label="Harika" onPress={close} style={{ alignSelf: 'stretch', marginTop: space.s }} />
          {unlocked.length ? (
            <Button label="Hemen giydir" kind="ghost" small onPress={() => { close(); router.push('/bond'); }} />
          ) : canShare && newForm ? (
            <Button label="Paylaş" kind="ghost" small onPress={() => setSharing(true)} />
          ) : null}
          {level < 30 && newForm ? (
            <T v="small" style={{ textAlign: 'center' }}>
              {`Sonraki görünüm seviye ${FORMS.find((f) => f.level > level)?.level ?? 30}'da.`}
            </T>
          ) : null}
        </View>
      </View>
      <ShareMascot visible={sharing} headline={`${settings.mascotName} artık ${form?.name.toLocaleLowerCase('tr-TR')}!`} onClose={() => setSharing(false)} />
    </Modal>
  );
}
