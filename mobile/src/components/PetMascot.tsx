import { Accelerometer } from 'expo-sensors';
import * as Haptics from 'expo-haptics';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing, Platform, Pressable, Text, View } from 'react-native';
import { Mascot, type Expression } from './Mascot';

/*
 * The mascot you can touch: tap to pet it, hold to hug it, shake the phone to
 * make it dizzy, and watch drops fall when you feed it.
 */

const PET_LINES = ['Hihi, gıdıklanıyorum!', 'Bir daha! 🌱', 'Seni gördüğüme sevindim.', 'Yapraklarım titredi!', 'Mmm, ne güzel sevdin.'];
const HUG_LINES = ['Ben de seni seviyorum.', 'Sarıl bakalım… oh be.', 'Böyle kalalım biraz.'];
const DIZZY_LINES = ['Başım döndüüü!', 'Deprem mi oldu?!', 'Yapraklarım dökülecek, yavaş!'];

type Particle = { id: number; glyph: string; x: number; anim: Animated.Value; fall: boolean };

export function PetMascot({
  size = 150, stage, aged, baseExpression = 'idle', onSay, feeding,
}: {
  size?: number;
  stage: number;
  aged: boolean;
  baseExpression?: Expression;
  onSay?: (line: string) => void;
  /** Increment to play the feeding animation. */
  feeding?: number;
}) {
  const [expression, setExpression] = useState<Expression | null>(null);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [bounce] = useState(() => new Animated.Value(1));
  const [wobble] = useState(() => new Animated.Value(0));
  const nextId = useRef(0);
  const reset = useRef<ReturnType<typeof setTimeout> | null>(null);

  const react = useCallback((e: Expression, ms = 1400) => {
    setExpression(e);
    if (reset.current) clearTimeout(reset.current);
    reset.current = setTimeout(() => setExpression(null), ms);
  }, []);

  const burst = useCallback((glyph: string, count: number, fall = false) => {
    const created = Array.from({ length: count }, () => ({
      id: nextId.current++, glyph, x: (Math.random() - 0.5) * size * 0.7, anim: new Animated.Value(0), fall,
    }));
    setParticles((p) => [...p, ...created]);
    created.forEach((p, i) =>
      Animated.timing(p.anim, { toValue: 1, duration: 1100 + i * 120, delay: i * 90, easing: Easing.out(Easing.quad), useNativeDriver: true }).start(() =>
        setParticles((all) => all.filter((x) => x.id !== p.id)),
      ),
    );
  }, [size]);

  const pop = useCallback(() => {
    bounce.setValue(0.9);
    Animated.spring(bounce, { toValue: 1, friction: 3, tension: 160, useNativeDriver: true }).start();
  }, [bounce]);

  const say = (lines: string[]) => onSay?.(lines[Math.floor(Math.random() * lines.length)]);

  const pet = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    pop();
    react('love');
    burst('💗', 3);
    say(PET_LINES);
  };

  const hug = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    react('caring', 2200);
    burst('💞', 5);
    say(HUG_LINES);
  };

  // Shake the phone: the mascot gets dizzy and loses a leaf (it grows back, promise).
  useEffect(() => {
    if (Platform.OS === 'web') return;
    let last = 0;
    Accelerometer.setUpdateInterval(120);
    const sub = Accelerometer.addListener(({ x, y, z }) => {
      const force = Math.sqrt(x * x + y * y + z * z);
      const now = Date.now();
      if (force > 2.4 && now - last > 2500) {
        last = now;
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => {});
        wobble.setValue(0);
        Animated.sequence(
          [1, -1, 1, -1, 0].map((v) => Animated.timing(wobble, { toValue: v, duration: 90, useNativeDriver: true })),
        ).start();
        react('dizzy', 2000);
        burst('🍃', 2, true);
        onSay?.(DIZZY_LINES[Math.floor(Math.random() * DIZZY_LINES.length)]);
      }
    });
    return () => sub.remove();
  }, [burst, onSay, react, wobble]);

  // Feeding animation.
  useEffect(() => {
    if (!feeding) return;
    Haptics.selectionAsync().catch(() => {});
    burst('💧', 1, true);
    const t = setTimeout(() => {
      pop();
      react('happy', 1000);
      burst('✨', 2);
    }, 650);
    return () => clearTimeout(t);
  }, [feeding, burst, pop, react]);

  useEffect(() => () => {
    if (reset.current) clearTimeout(reset.current);
  }, []);

  const rotate = wobble.interpolate({ inputRange: [-1, 1], outputRange: ['-8deg', '8deg'] });

  return (
    <View style={{ width: size, alignItems: 'center' }}>
      <Pressable onPress={pet} onLongPress={hug} delayLongPress={450} accessibilityRole="button" accessibilityLabel="Maskotu sev" accessibilityHint="Dokun: sev. Basılı tut: sarıl.">
        <Animated.View style={{ transform: [{ scale: bounce }, { rotate }] }}>
          <Mascot size={size} expression={expression ?? baseExpression} stage={stage} aged={aged} />
        </Animated.View>
      </Pressable>
      {particles.map((p) => {
        const translateY = p.anim.interpolate({ inputRange: [0, 1], outputRange: p.fall ? [-size * 0.35, size * 0.35] : [size * 0.25, -size * 0.25] });
        const opacity = p.anim.interpolate({ inputRange: [0, 0.2, 0.8, 1], outputRange: [0, 1, 1, 0] });
        return (
          <Animated.View key={p.id} pointerEvents="none" style={{ position: 'absolute', top: size * 0.4, left: size / 2 - 10 + p.x, opacity, transform: [{ translateY }] }}>
            <Text style={{ fontSize: 20 }}>{p.glyph}</Text>
          </Animated.View>
        );
      })}
    </View>
  );
}
