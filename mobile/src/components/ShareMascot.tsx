import * as Sharing from 'expo-sharing';
import { useRef, useState } from 'react';
import { Modal, Platform, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';
import { track } from '@/lib/analytics';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { serif, space, useColors } from '@/theme';
import { Mascot } from './Mascot';
import { Button, T } from './ui';

export const canShare = Platform.OS !== 'web';

/*
 * A pretty card of the mascot to share on Instagram or WhatsApp. It shows
 * the mascot, its stage and age, never anything from the diary.
 */
export function ShareMascot({ visible, headline, onClose }: { visible: boolean; headline: string; onClose: () => void }) {
  const c = useColors();
  const { settings } = useSettings();
  const { info } = usePet();
  const card = useRef<View>(null);
  const [busy, setBusy] = useState(false);

  const share = async () => {
    if (!card.current) return;
    setBusy(true);
    try {
      const uri = await captureRef(card, { format: 'png', quality: 1 });
      await Sharing.shareAsync(uri, { mimeType: 'image/png', dialogTitle: 'Maskotunu paylaş' });
      track('mascot_shared');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0009', alignItems: 'center', justifyContent: 'center', padding: space.l, gap: space.m }}>
        <View ref={card} collapsable={false} style={{ backgroundColor: '#FBF7F0', borderRadius: 28, padding: space.l, alignItems: 'center', gap: space.s, width: 300 }}>
          <T v="title" style={{ fontFamily: serif, color: '#2B2622', textAlign: 'center', fontSize: 24 }}>{headline}</T>
          <Mascot size={170} expression="happy" stage={info.index} aged={info.aged} breathing={false} />
          <T v="heading" style={{ color: '#2B2622' }}>{settings.mascotName}</T>
          <T v="small" style={{ color: '#7A7069' }}>
            {info.stage.name}
            {info.age ? ` · ${info.age.label}` : ''}
          </T>
          <T v="small" style={{ color: '#7A7069', marginTop: space.s }}>🌱 Pusula Günlük ile büyüyoruz</T>
        </View>
        <View style={{ flexDirection: 'row', gap: space.s }}>
          <Button label={busy ? '…' : 'Paylaş'} onPress={share} disabled={busy} />
          <Button label="Kapat" kind="secondary" onPress={onClose} style={{ backgroundColor: c.card }} />
        </View>
      </View>
    </Modal>
  );
}
