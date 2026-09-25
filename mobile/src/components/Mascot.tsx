import { useEffect, useState } from 'react';
import { Animated, Easing } from 'react-native';
import Svg, { Circle, Ellipse, G, Path } from 'react-native-svg';
import { useColors } from '@/theme';

export type Expression = 'idle' | 'happy' | 'curious' | 'caring' | 'sleepy' | 'love' | 'dizzy' | 'surprised';

/** Body size per growth stage (tohum → bilge ağaç). */
const BODY_SCALE = [0.8, 0.86, 0.92, 0.97, 1, 1.04, 1.08];
const STEM = [6, 12, 20, 24, 26, 22, 26];
/** How far the plant reaches above its stem tip, per stage. */
const CROWN = [8, 10, 10, 12, 14, 16, 22];

/** Top of the drawing for a stage, so small stages don't reserve room for a tree. */
function frameTop(stage: number): number {
  const top = 110 - 82 * BODY_SCALE[stage];
  return Math.floor(top - STEM[stage] - CROWN[stage] - 4);
}

/**
 * Pusula: an ink-drop creature with a plant on its head. The plant grows
 * through seven stages as the user writes; after a year together it wears
 * little round glasses.
 */
export function Mascot({
  size = 96, expression = 'idle', stage = 1, aged = false, breathing = true,
}: { size?: number; expression?: Expression; stage?: number; aged?: boolean; breathing?: boolean }) {
  const c = useColors();
  const [breathe] = useState(() => new Animated.Value(0));

  useEffect(() => {
    if (!breathing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, breathing]);

  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.035] });
  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -2] });
  const st = Math.max(0, Math.min(6, Math.round(stage)));
  const s = BODY_SCALE[st];
  const top = 110 - 82 * s; // body top after scaling around the feet (60, 110)
  const y0 = frameTop(st);
  const h = 116 - y0;

  return (
    <Animated.View style={{ width: size, height: (size * h) / 120, transform: [{ translateY }, { scaleY }] }} accessibilityLabel="Maskot">
      <Svg width={size} height={(size * h) / 120} viewBox={`0 ${y0} 120 ${h}`}>
        <Plant stage={st} top={top} />
        <G transform={`translate(60 110) scale(${s}) translate(-60 -110)`}>
          <Path d="M60 28 C88 28 104 52 104 76 C104 98 86 110 60 110 C34 110 16 98 16 76 C16 52 32 28 60 28 Z" fill={c.mascot} />
          <Ellipse cx={60} cy={86} rx={28} ry={20} fill="#FFFFFF" opacity={0.28} />
          <Path d="M30 60 C34 48 44 40 52 38" stroke="#FFFFFF" strokeWidth={4} strokeLinecap="round" opacity={0.35} fill="none" />
          <Ellipse cx={36} cy={80} rx={7} ry={4.5} fill="#F2A3A0" opacity={expression === 'caring' || expression === 'love' ? 0.8 : 0.5} />
          <Ellipse cx={84} cy={80} rx={7} ry={4.5} fill="#F2A3A0" opacity={expression === 'caring' || expression === 'love' ? 0.8 : 0.5} />
          <Face expression={expression} />
          {aged ? <Glasses /> : null}
        </G>
      </Svg>
    </Animated.View>
  );
}

const INK = '#2B2622';
const LEAF_A = '#86BD6F';
const LEAF_B = '#9CCB84';
const STEM_COLOR = '#6B9E5B';

function Leaf({ x, y, flip = false, scale = 1 }: { x: number; y: number; flip?: boolean; scale?: number }) {
  const d = flip ? 'c9 -9 18 -4 18 2 c-8 3 -14 1 -18 -2 z' : 'c-10 -8 -18 -2 -18 4 c8 2 14 0 18 -4 z';
  return <Path d={`M${x} ${y} ${d}`} fill={flip ? LEAF_B : LEAF_A} transform={`translate(${x} ${y}) scale(${scale}) translate(${-x} ${-y})`} />;
}

function Plant({ stage, top }: { stage: number; top: number }) {
  const stem = STEM[stage];
  const tip = top - stem;
  const stemPath = <Path d={`M60 ${top + 2} C58 ${top - stem / 2} 62 ${top - stem / 2} 60 ${tip}`} stroke={STEM_COLOR} strokeWidth={3} strokeLinecap="round" fill="none" />;
  switch (stage) {
    case 0:
      return (
        <G>
          {stemPath}
          <Leaf x={60} y={tip + 2} flip scale={0.6} />
          <Ellipse cx={60} cy={top + 1} rx={9} ry={4} fill="#B98A5E" />
        </G>
      );
    case 1:
      return (
        <G>
          {stemPath}
          <Leaf x={60} y={tip + 2} />
          <Leaf x={60} y={tip + 6} flip />
        </G>
      );
    case 2:
      return (
        <G>
          {stemPath}
          <Leaf x={60} y={tip + 2} />
          <Leaf x={60} y={tip + 5} flip />
          <Leaf x={60} y={tip + 12} scale={0.8} />
          <Leaf x={60} y={tip + 15} flip scale={0.8} />
        </G>
      );
    case 3:
      return (
        <G>
          {stemPath}
          <Leaf x={60} y={tip + 10} />
          <Leaf x={60} y={tip + 13} flip />
          <Path d={`M60 ${tip - 10} C66 ${tip - 4} 65 ${tip + 2} 60 ${tip + 2} C55 ${tip + 2} 54 ${tip - 4} 60 ${tip - 10} Z`} fill="#F4A7B9" />
          <Path d={`M56 ${tip} q4 3 8 0`} stroke={LEAF_A} strokeWidth={2.5} fill="none" strokeLinecap="round" />
        </G>
      );
    case 4:
      return (
        <G>
          {stemPath}
          <Leaf x={60} y={tip + 12} />
          <Leaf x={60} y={tip + 15} flip />
          {[0, 72, 144, 216, 288].map((a) => (
            <Ellipse key={a} cx={60} cy={tip - 7} rx={4.5} ry={7} fill="#F59FB5" transform={`rotate(${a} 60 ${tip})`} />
          ))}
          <Circle cx={60} cy={tip} r={4.5} fill="#F7D774" />
        </G>
      );
    case 5:
      return (
        <G>
          {stemPath}
          <Circle cx={52} cy={tip + 2} r={9} fill={LEAF_A} />
          <Circle cx={68} cy={tip + 2} r={9} fill={LEAF_A} />
          <Circle cx={60} cy={tip - 5} r={11} fill={LEAF_B} />
        </G>
      );
    default:
      return (
        <G>
          {stemPath}
          <Circle cx={48} cy={tip + 4} r={11} fill={LEAF_A} />
          <Circle cx={72} cy={tip + 4} r={11} fill={LEAF_A} />
          <Circle cx={60} cy={tip - 6} r={14} fill={LEAF_B} />
          <Circle cx={52} cy={tip - 2} r={2.8} fill="#E8665A" />
          <Circle cx={67} cy={tip - 9} r={2.8} fill="#E8665A" />
          <Circle cx={70} cy={tip + 5} r={2.8} fill="#E8665A" />
        </G>
      );
  }
}

function Glasses() {
  return (
    <G>
      <Circle cx={46} cy={68} r={10} stroke={INK} strokeWidth={2} fill="#FFFFFF" fillOpacity={0.12} />
      <Circle cx={74} cy={68} r={10} stroke={INK} strokeWidth={2} fill="#FFFFFF" fillOpacity={0.12} />
      <Path d="M56 67 Q60 64 64 67" stroke={INK} strokeWidth={2} fill="none" />
    </G>
  );
}

function Face({ expression }: { expression: Expression }) {
  const eye = (cx: number, big = false) => (
    <G>
      <Ellipse cx={cx} cy={68} rx={big ? 6 : 5} ry={big ? 7.5 : 6.5} fill={INK} />
      <Circle cx={cx + 2} cy={65.5} r={1.8} fill="#FFFFFF" />
    </G>
  );
  const stroke = { stroke: INK, strokeWidth: 3, strokeLinecap: 'round' as const, fill: 'none' };
  const heart = (x: number, y: number, s: number) => (
    <Path d={`M${x} ${y + s * 0.3} c-${s * 0.5} -${s * 0.5} -${s} ${s * 0.1} -${s * 0.5} ${s * 0.6} l${s * 0.5} ${s * 0.5} l${s * 0.5} -${s * 0.5} c${s * 0.5} -${s * 0.5} 0 -${s * 1.1} -${s * 0.5} -${s * 0.6} z`} fill="#E8665A" />
  );

  switch (expression) {
    case 'happy':
      return (
        <G>
          <Path d="M40 70 Q46 62 52 70" {...stroke} />
          <Path d="M68 70 Q74 62 80 70" {...stroke} />
          <Path d="M50 82 Q60 92 70 82" {...stroke} />
        </G>
      );
    case 'love':
      return (
        <G>
          {heart(46, 62, 10)}
          {heart(74, 62, 10)}
          <Path d="M50 82 Q60 92 70 82" {...stroke} />
        </G>
      );
    case 'curious':
      return (
        <G>
          {eye(46, true)}
          {eye(74, true)}
          <Path d="M66 55 Q74 50 82 55" {...stroke} strokeWidth={2.5} />
          <Circle cx={60} cy={86} r={3.5} fill={INK} />
        </G>
      );
    case 'surprised':
      return (
        <G>
          {eye(46, true)}
          {eye(74, true)}
          <Ellipse cx={60} cy={87} rx={4.5} ry={5.5} fill={INK} />
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
    case 'dizzy':
      return (
        <G>
          <Path d="M41 63 L51 73 M51 63 L41 73" {...stroke} strokeWidth={2.5} />
          <Path d="M69 63 L79 73 M79 63 L69 73" {...stroke} strokeWidth={2.5} />
          <Path d="M50 86 Q55 81 60 86 Q65 91 70 86" {...stroke} strokeWidth={2.5} />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d="M40 70 L52 70" {...stroke} />
          <Path d="M68 70 L80 70" {...stroke} />
          <Ellipse cx={60} cy={85} rx={3} ry={2.5} fill={INK} />
          <Path d="M88 44 h8 l-8 8 h8" stroke={INK} strokeWidth={2} fill="none" opacity={0.6} />
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
