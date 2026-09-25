import { useEffect, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { usePet } from '@/lib/pet';
import { space, useColors } from '@/theme';
import { Mascot } from './Mascot';

/** The mascot tilting its head while it thinks, with three pulsing dots. */
export function Thinking() {
  const c = useColors();
  const { info } = usePet();
  const [tilt] = useState(() => new Animated.Value(0));
  const [dots] = useState(() => [0, 1, 2].map(() => new Animated.Value(0.3)));

  useEffect(() => {
    const t = Animated.loop(
      Animated.sequence([
        Animated.timing(tilt, { toValue: 1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(tilt, { toValue: -1, duration: 700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    const d = Animated.loop(
      Animated.stagger(
        180,
        dots.map((v) =>
          Animated.sequence([
            Animated.timing(v, { toValue: 1, duration: 300, useNativeDriver: true }),
            Animated.timing(v, { toValue: 0.3, duration: 300, useNativeDriver: true }),
          ]),
        ),
      ),
    );
    t.start();
    d.start();
    return () => {
      t.stop();
      d.stop();
    };
  }, [tilt, dots]);

  const rotate = tilt.interpolate({ inputRange: [-1, 1], outputRange: ['-7deg', '7deg'] });
  return (
    <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: space.s }} accessibilityLabel="Düşünüyor">
      <Animated.View style={{ transform: [{ rotate }] }}>
        <Mascot size={44} expression="curious" stage={info.index} aged={info.aged} breathing={false} />
      </Animated.View>
      <View style={{ flexDirection: 'row', gap: 5, backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 16, paddingVertical: 12, paddingHorizontal: 14, marginBottom: 8 }}>
        {dots.map((v, i) => (
          <Animated.View key={i} style={{ width: 7, height: 7, borderRadius: 4, backgroundColor: c.muted, opacity: v }} />
        ))}
      </View>
    </View>
  );
}
