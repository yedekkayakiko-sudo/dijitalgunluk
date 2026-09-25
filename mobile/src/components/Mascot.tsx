import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useColors } from '@/theme';

export type Expression = 'idle' | 'happy' | 'curious' | 'caring' | 'sleepy';

/**
 * Pusula: a small ink-drop creature with a sprout that "grows" with the diary.
 * `growth` (0..1) makes the sprout taller as the user writes more pages.
 */
export function Mascot({ size = 96, expression = 'idle', growth = 0.3 }: { size?: number; expression?: Expression; growth?: number }) {
  const c = useColors();
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe]);

  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const stem = 10 + Math.max(0, Math.min(1, growth)) * 14;
  const ink = '#2B2622';

  return (
    <Animated.View style={{ width: size, height: size, transform: [{ translateY }, { scaleY }] }} accessibilityLabel="Maskot">
      <Svg width={size} height={size} viewBox="0 0 120 120">
        {/* sprout */}
        <Path d={`M60 30 C60 ${30 - stem / 2} 60 ${30 - stem} 60 ${30 - stem}`} stroke="#6B9E5B" strokeWidth={3} strokeLinecap="round" fill="none" />
        <Path d={`M60 ${32 - stem} c-10 -8 -18 -2 -18 4 c8 2 14 0 18 -4 z`} fill="#86BD6F" />
        <Path d={`M60 ${36 - stem} c9 -9 18 -4 18 2 c-8 3 -14 1 -18 -2 z`} fill="#9CCB84" />
        {/* body */}
        <Path d="M60 28 C88 28 104 52 104 76 C104 98 86 110 60 110 C34 110 16 98 16 76 C16 52 32 28 60 28 Z" fill={c.mascot} />
        <Ellipse cx={60} cy={86} rx={28} ry={20} fill="#FFFFFF" opacity={0.28} />
        <Path d="M30 60 C34 48 44 40 52 38" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.35} fill="none" />
        {/* cheeks */}
        <Ellipse cx={36} cy={80} rx={7} ry={4.5} fill="#F2A3A0" opacity={expression === 'caring' ? 0.75 : 0.5} />
        <Ellipse cx={84} cy={80} rx={7} ry={4.5} fill="#F2A3A0" opacity={expression === 'caring' ? 0.75 : 0.5} />
        <Face expression={expression} ink={ink} />
      </Svg>
    </Animated.View>
  );
}

function Face({ expression, ink }: { expression: Expression; ink: string }) {
  const eye = (cx: number, big = false) => (
    <G>
      <Ellipse cx={cx} cy={68} rx={big ? 6 : 5} ry={big ? 7.5 : 6.5} fill={ink} />
      <Circle cx={cx + 2} cy={65.5} r={1.8} fill="#FFFFFF" />
    </G>
  );
  const stroke = { stroke: ink, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' };

  switch (expression) {
    case 'happy':
      return (
        <G>
          <Path d="M40 70 Q46 62 52 70" {...stroke} />
          <Path d="M68 70 Q74 62 80 70" {...stroke} />
          <Path d="M50 82 Q60 92 70 82" {...stroke} />
        </G>
      );
    case 'curious':
      return (
        <G>
          {eye(46, true)}
          {eye(74, true)}
          <Path d="M66 55 Q74 50 82 55" {...stroke} strokeWidth={2.5} />
          <Circle cx={60} cy={86} r={3.5} fill={ink} />
        </G>
      );
    case 'caring':
      return (
        <G>
          <Path d="M40 68 Q46 73 52 68" {...stroke} />
          <Path d="M68 68 Q74 73 80 68" {...stroke} />
          <Path d="M53 83 Q60 88 67 83" {...stroke} />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d="M40 70 L52 70" {...stroke} />
          <Path d="M68 70 L80 70" {...stroke} />
          <Ellipse cx={60} cy={85} rx={3} ry={2.5} fill={ink} />
          <Path d="M88 44 h8 l-8 8 h8" stroke={ink} strokeWidth={2} fill="none" opacity={0.6} />
        </G>
      );
    default:
      return (
        <G>
          {eye(46)}
          {eye(74)}
          <Path d="M52 83 Q60 89 68 83" {...stroke} />
        </G>
      );
  }
}
