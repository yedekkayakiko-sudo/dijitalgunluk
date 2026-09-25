import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, View } from 'react-native';
import { Mascot } from '@/components/Mascot';
import { Button, Gap, Screen, T } from '@/components/ui';
import { track } from '@/lib/analytics';
import { usePet } from '@/lib/pet';
import { useSettings } from '@/lib/settings';
import { space } from '@/theme';

/*
 * Breathing together: in for 4, hold for 2, out for 6. A longer out-breath
 * helps the body settle. The mascot grows and shrinks with each breath.
 */

const PHASES = [
  { label: 'Nefes al…', seconds: 4, to: 1.35 },
  { label: 'Tut…', seconds: 2, to: 1.35 },
  { label: 'Yavaşça ver…', seconds: 6, to: 1 },
] as const;
const ROUNDS = 5;

export default function Breathe() {
  const { settings } = useSettings();
  const { info } = usePet();
  const [scale] = useState(() => new Animated.Value(1));
  const [running, setRunning] = useState(false);
  const [phase, setPhase] = useState(0);
  const [round, setRound] = useState(0);
  const [done, setDone] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const stop = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
    scale.stopAnimation();
    setRunning(false);
  };

  useEffect(() => stop, []); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => {
    stop();
    setDone(false);
    setRunning(true);
    let t = 0;
    for (let r = 0; r < ROUNDS; r++) {
      PHASES.forEach((p, i) => {
        timers.current.push(
          setTimeout(() => {
            setRound(r + 1);
            setPhase(i);
            Animated.timing(scale, { toValue: p.to, duration: p.seconds * 1000, easing: Easing.inOut(Easing.sin), useNativeDriver: true }).start();
          }, t),
        );
        t += p.seconds * 1000;
      });
    }
    timers.current.push(
      setTimeout(() => {
        setRunning(false);
        setDone(true);
        track('breathing_done');
      }, t),
    );
  };

  return (
    <Screen scroll={false}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.l }}>
        <T v="title" style={{ textAlign: 'center' }}>
          {running ? PHASES[phase].label : done ? 'Ne güzel yaptın.' : 'Birlikte nefes alalım'}
        </T>
        <Animated.View style={{ transform: [{ scale }] }}>
          <Mascot size={150} expression={running ? 'caring' : done ? 'happy' : 'idle'} stage={info.index} aged={info.aged} breathing={false} />
        </Animated.View>
        <T v="muted" style={{ textAlign: 'center' }}>
          {running
            ? `${round}. nefes / ${ROUNDS}`
            : done
              ? `${settings.mascotName} de rahatladı. İstersen biraz daha devam edebilir, ya da aklından geçenleri yazabilirsin.`
              : '4 saniye nefes al, 2 saniye tut, 6 saniye yavaşça ver. Beş nefes, yaklaşık bir dakika.'}
        </T>
        <Gap h={space.s} />
        {running ? <Button label="Durdur" kind="ghost" onPress={stop} /> : <Button label={done ? 'Bir tur daha' : 'Başlayalım'} onPress={start} />}
      </View>
    </Screen>
  );
}
