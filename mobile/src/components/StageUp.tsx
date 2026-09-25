import type { Stage } from '@gunluk/core';
import { useEffect, useState } from 'react';
import { Animated, Modal, View } from 'react-native';
import { space, useColors } from '@/theme';
import { Mascot } from './Mascot';
import { Button, T } from './ui';

/** Celebration when the mascot reaches a new growth stage. */
export function StageUp({ stage, index, aged, onClose }: { stage: Stage | null; index: number; aged: boolean; onClose: () => void }) {
  const c = useColors();
  const [scale] = useState(() => new Animated.Value(0.6));
  useEffect(() => {
    if (!stage) return;
    scale.setValue(0.6);
    Animated.spring(scale, { toValue: 1, friction: 4, useNativeDriver: true }).start();
  }, [stage, scale]);
  return (
    <Modal visible={!!stage} transparent animationType="fade" onRequestClose={onClose}>
      <View style={{ flex: 1, backgroundColor: '#0008', alignItems: 'center', justifyContent: 'center', padding: space.l }}>
        <View style={{ backgroundColor: c.card, borderRadius: 24, padding: space.l, alignItems: 'center', gap: space.m, width: '100%', maxWidth: 360 }}>
          <T v="title" style={{ textAlign: 'center' }}>🎉 Büyüdüm!</T>
          <Animated.View style={{ transform: [{ scale }] }}>
            <Mascot size={150} expression="happy" stage={index} aged={aged} />
          </Animated.View>
          <T v="heading">Artık bir {stage?.name.toLocaleLowerCase('tr-TR')}</T>
          <T v="muted" style={{ textAlign: 'center' }}>{stage?.line}</T>
          <Button label="Yaşasın!" onPress={onClose} style={{ alignSelf: 'stretch' }} />
        </View>
      </View>
    </Modal>
  );
}
