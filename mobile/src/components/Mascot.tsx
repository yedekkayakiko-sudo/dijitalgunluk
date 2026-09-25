import { isNight, type Accessory } from '@gunluk/core';
import { useEffect, useState } from 'react';
import { Animated, Easing, Text } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Path, RadialGradient, Stop } from 'react-native-svg';

export type Expression = 'idle' | 'happy' | 'curious' | 'caring' | 'sleepy' | 'love' | 'dizzy' | 'surprised';

/** What the mascot looks like right now: its form (0–9), what it wears, what it carries. */
export interface MascotLook {
  form: number;
  accessory?: Accessory['id'];
  /** Glyph of its strongest trait, held in its hand (☕, 📖, 🎵…). */
  prop?: string | null;
  aged?: boolean;
}

export const BABY_LOOK: MascotLook = { form: 0 };

/** Body scale per form: a round baby that fills out as the bond grows. */
const SCALE = [0.74, 0.78, 0.82, 0.86, 0.89, 0.92, 0.95, 0.97, 1, 1];
/** How far the head decoration reaches above the body, per form. */
const CROWN = [8, 16, 18, 22, 22, 28, 30, 30, 32, 34];

const BODY = '#BDE7DC';
const BODY_SHADE = '#97D3C4';
const BELLY = '#F2FBF7';
const CHEEK = '#FFB1B5';
const INK = '#3A3330';
const LEAF = '#7CC26B';
const LEAF_LIGHT = '#A2D98C';
const STEM = '#5FA653';
const PETAL = '#FF9FB8';
const PETAL_LIGHT = '#FFC4D3';
const GOLD = '#FFD66B';

/** Top of the drawing, so small forms don't reserve empty room for a crown. Hats reach higher. */
function frameTop(form: number, hat: boolean): number {
  const top = 110 - 70 * SCALE[form];
  const crown = hat ? Math.max(CROWN[form], 20) : CROWN[form];
  return Math.floor(top - crown * SCALE[form] - (form >= 9 ? 10 : 4));
}

/**
 * The mascot: a soft, round little creature with a sprout on its head. It
 * grows through ten forms as the bond deepens (ears, a leafy tail, a flower,
 * freckles, a flower crown, a glow), wears what the user picks, and holds a
 * little something that says what its person loves.
 */
export function Mascot({
  size = 96, expression = 'idle', look = BABY_LOOK, breathing = true, dressed = true, night: nightOverride,
}: {
  size?: number;
  expression?: Expression;
  look?: MascotLook;
  /** Animated (breathing, blinking). Off for small static uses. */
  breathing?: boolean;
  /** Accessories, night cap and the held prop. */
  dressed?: boolean;
  /** Force the night cap on or off (previews); by default it follows the clock. */
  night?: boolean;
}) {
  const [breathe] = useState(() => new Animated.Value(0));
  const [blink, setBlink] = useState(false);
  const [clockNight] = useState(() => isNight());
  const night = nightOverride ?? clockNight;

  useEffect(() => {
    if (!breathing) return;
    let timer: ReturnType<typeof setTimeout>;
    const next = () => {
      timer = setTimeout(() => {
        setBlink(true);
        timer = setTimeout(() => {
          setBlink(false);
          next();
        }, 130);
      }, 2200 + Math.random() * 3400);
    };
    next();
    return () => clearTimeout(timer);
  }, [breathing]);

  useEffect(() => {
    if (!breathing) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(breathe, { toValue: 1, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(breathe, { toValue: 0, duration: 1700, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [breathe, breathing]);

  const form = Math.max(0, Math.min(9, Math.round(look.form)));
  const s = SCALE[form];
  const accessory = dressed ? (look.accessory ?? 'none') : 'none';
  const nightCap = dressed && night && !['beanie', 'crown', 'headphones', 'flowerpin'].includes(accessory);
  const y0 = frameTop(form, nightCap || accessory === 'beanie' || accessory === 'crown');
  const h = 118 - y0;
  const height = (size * h) / 120;
  const scaleY = breathe.interpolate({ inputRange: [0, 1], outputRange: [1, 1.03] });
  const translateY = breathe.interpolate({ inputRange: [0, 1], outputRange: [0, -1.5] });
  const glasses = accessory === 'glasses' || (dressed && look.aged && accessory === 'none');
  const unit = size / 120;

  return (
    <Animated.View style={{ width: size, height, transform: [{ translateY }, { scaleY }] }} accessibilityLabel="Maskot">
      <Svg width={size} height={height} viewBox={`0 ${y0} 120 ${h}`}>
        <Defs>
          <RadialGradient id="body" cx="42%" cy="35%" r="70%">
            <Stop offset="0" stopColor="#E3F6F0" />
            <Stop offset="0.55" stopColor={BODY} />
            <Stop offset="1" stopColor={BODY_SHADE} />
          </RadialGradient>
          <RadialGradient id="glow" cx="50%" cy="50%" r="50%">
            <Stop offset="0" stopColor={GOLD} stopOpacity={0.45} />
            <Stop offset="1" stopColor={GOLD} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        {form >= 9 ? <Circle cx={60} cy={70} r={56} fill="url(#glow)" /> : null}
        <Ellipse cx={60} cy={112} rx={30 * s} ry={4} fill="#000" opacity={0.08} />
        <G transform={`translate(60 110) scale(${s}) translate(-60 -110)`}>
          {form >= 4 ? <Tail /> : null}
          {accessory === 'backpack' ? <Backpack /> : null}
          {form >= 2 ? <Ears /> : null}
          {/* feet */}
          <Ellipse cx={46} cy={107} rx={9} ry={5} fill={BODY_SHADE} />
          <Ellipse cx={74} cy={107} rx={9} ry={5} fill={BODY_SHADE} />
          {/* body */}
          <Path d="M60 40 C87 40 103 60 103 81 C103 99 85 109 60 109 C35 109 17 99 17 81 C17 60 33 40 60 40 Z" fill="url(#body)" />
          <Ellipse cx={60} cy={92} rx={25} ry={14} fill={BELLY} opacity={0.75} />
          <Path d="M33 58 C37 50 44 46 50 45" stroke="#FFFFFF" strokeWidth={3.5} strokeLinecap="round" opacity={0.6} fill="none" />
          {form >= 7 ? <Freckles /> : null}
          {/* arms */}
          <Ellipse cx={19} cy={86} rx={5.5} ry={8.5} fill={BODY_SHADE} transform="rotate(28 19 86)" />
          <Ellipse cx={101} cy={86} rx={5.5} ry={8.5} fill={BODY_SHADE} transform="rotate(-28 101 86)" />
          <Ellipse cx={36} cy={83} rx={6.5} ry={4} fill={CHEEK} opacity={expression === 'love' || expression === 'caring' ? 0.95 : 0.7} />
          <Ellipse cx={84} cy={83} rx={6.5} ry={4} fill={CHEEK} opacity={expression === 'love' || expression === 'caring' ? 0.95 : 0.7} />
          <Face expression={expression} blink={blink} />
          {glasses ? <Glasses /> : null}
          {accessory === 'scarf' ? <Scarf /> : null}
          {accessory === 'bow' ? <Bow /> : null}
          {nightCap ? null : <Sprout form={form} />}
          {form >= 8 && !nightCap ? <FlowerCrown /> : null}
          {accessory === 'beanie' ? <Beanie /> : null}
          {accessory === 'headphones' ? <Headphones /> : null}
          {accessory === 'flowerpin' ? <Flower x={84} y={50} r={5} /> : null}
          {accessory === 'crown' ? <Crown /> : null}
          {nightCap ? <NightCap /> : null}
        </G>
        {form >= 9 ? <Sparkles /> : null}
      </Svg>
      {dressed && look.prop ? (
        <Text
          style={{ position: 'absolute', right: size * 0.02, bottom: size * 0.06, fontSize: Math.max(10, 20 * unit), lineHeight: Math.max(12, 24 * unit) }}
          accessibilityElementsHidden>
          {look.prop}
        </Text>
      ) : null}
    </Animated.View>
  );
}

function Leaf({ x, y, angle, len = 12, fill = LEAF }: { x: number; y: number; angle: number; len?: number; fill?: string }) {
  const w = len * 0.55;
  return <Path d={`M0 0 C${w} ${-len * 0.25} ${w} ${-len * 0.8} 0 ${-len} C${-w} ${-len * 0.8} ${-w} ${-len * 0.25} 0 0 Z`} fill={fill} transform={`translate(${x} ${y}) rotate(${angle})`} />;
}

function Flower({ x, y, r, petal = PETAL }: { x: number; y: number; r: number; petal?: string }) {
  return (
    <G>
      {[0, 72, 144, 216, 288].map((a) => (
        <Ellipse key={a} cx={x} cy={y - r} rx={r * 0.62} ry={r * 0.95} fill={petal} transform={`rotate(${a} ${x} ${y})`} />
      ))}
      <Circle cx={x} cy={y} r={r * 0.55} fill={GOLD} />
    </G>
  );
}

function Sprout({ form }: { form: number }) {
  const base = 41;
  if (form === 0) return <Leaf x={60} y={base + 1} angle={18} len={9} fill={LEAF_LIGHT} />;
  const stem = form < 3 ? 8 : form < 5 ? 12 : 16;
  const tip = base - stem;
  return (
    <G>
      <Path d={`M60 ${base + 1} C58 ${base - stem / 2} 62 ${base - stem / 2} 60 ${tip}`} stroke={STEM} strokeWidth={2.6} strokeLinecap="round" fill="none" />
      {form < 3 ? (
        <Leaf x={60} y={tip + 2} angle={35} len={13} />
      ) : (
        <G>
          <Leaf x={60} y={tip + 4} angle={-55} len={13} fill={LEAF_LIGHT} />
          <Leaf x={60} y={tip + 3} angle={55} len={14} />
        </G>
      )}
      {form === 5 ? <Path d={`M60 ${tip - 11} C66 ${tip - 5} 65 ${tip + 1} 60 ${tip + 1} C55 ${tip + 1} 54 ${tip - 5} 60 ${tip - 11} Z`} fill={PETAL} /> : null}
      {form >= 6 ? <Flower x={60} y={tip - 3} r={6.5} /> : null}
    </G>
  );
}

function Ears() {
  return (
    <G>
      <Path d="M30 56 C22 44 22 30 30 24 C38 30 42 42 40 50 Z" fill={BODY_SHADE} />
      <Path d="M31 51 C26 43 26 34 30 30 C35 35 37 42 36 48 Z" fill={CHEEK} opacity={0.55} />
      <Path d="M90 56 C98 44 98 30 90 24 C82 30 78 42 80 50 Z" fill={BODY_SHADE} />
      <Path d="M89 51 C94 43 94 34 90 30 C85 35 83 42 84 48 Z" fill={CHEEK} opacity={0.55} />
    </G>
  );
}

function Tail() {
  return (
    <G>
      <Path d="M96 96 C108 96 116 86 114 72 C104 74 96 84 96 96 Z" fill={LEAF} />
      <Path d="M97 95 C104 88 109 81 113 74" stroke={STEM} strokeWidth={1.4} fill="none" opacity={0.7} />
    </G>
  );
}

function Freckles() {
  return (
    <G opacity={0.7}>
      {[[40, 60, 2.2], [46, 55, 1.6], [80, 60, 2.2], [74, 55, 1.6], [60, 51, 1.8], [88, 72, 1.5], [32, 72, 1.5]].map(([x, y, r]) => (
        <Circle key={`${x}-${y}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
      ))}
    </G>
  );
}

function FlowerCrown() {
  return (
    <G>
      <Path d="M36 50 C46 42 74 42 84 50" stroke={LEAF} strokeWidth={3} fill="none" strokeLinecap="round" />
      <Flower x={38} y={49} r={4} petal={PETAL_LIGHT} />
      <Flower x={49} y={44} r={4.2} petal="#FFE08A" />
      <Flower x={71} y={44} r={4.2} petal={PETAL_LIGHT} />
      <Flower x={82} y={49} r={4} petal="#C9B6FF" />
    </G>
  );
}

function Sparkles() {
  const star = (x: number, y: number, r: number) => (
    <Path key={`${x}-${y}`} d={`M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r} Z`} fill={GOLD} />
  );
  return <G>{[star(16, 44, 5), star(104, 36, 4), star(110, 70, 3), star(10, 80, 3.5), star(92, 18, 3)]}</G>;
}

function Glasses() {
  return (
    <G>
      <Circle cx={45} cy={71} r={10} stroke={INK} strokeWidth={1.8} fill="#FFFFFF" fillOpacity={0.15} />
      <Circle cx={75} cy={71} r={10} stroke={INK} strokeWidth={1.8} fill="#FFFFFF" fillOpacity={0.15} />
      <Path d="M55 70 Q60 67 65 70" stroke={INK} strokeWidth={1.8} fill="none" />
    </G>
  );
}

function Scarf() {
  return (
    <G>
      <Path d="M24 94 Q60 108 96 94 L97 102 Q60 116 23 102 Z" fill="#F07C6C" />
      <Path d="M36 99 L36 106 M52 102 L52 109 M68 102 L68 109 M84 99 L84 106" stroke="#FFD2CB" strokeWidth={2.4} />
      <Path d="M78 104 l4 13 l8 -2 l-4 -13 z" fill="#F07C6C" />
    </G>
  );
}

function Bow() {
  return (
    <G>
      <Path d="M60 100 L48 93 L48 107 Z" fill="#F46F8E" />
      <Path d="M60 100 L72 93 L72 107 Z" fill="#F46F8E" />
      <Circle cx={60} cy={100} r={3.2} fill="#D9476A" />
    </G>
  );
}

function Beanie() {
  return (
    <G>
      <Path d="M28 58 C30 36 46 28 60 28 C74 28 90 36 92 58 Z" fill="#7F8CE0" />
      <Path d="M26 58 Q60 50 94 58 L94 64 Q60 56 26 64 Z" fill="#6573CF" />
      <Circle cx={60} cy={26} r={6} fill="#FFFFFF" />
    </G>
  );
}

function Headphones() {
  return (
    <G>
      <Path d="M22 74 C22 40 98 40 98 74" stroke="#4B4E6D" strokeWidth={4} fill="none" />
      <Ellipse cx={21} cy={76} rx={6} ry={9} fill="#F2A541" />
      <Ellipse cx={99} cy={76} rx={6} ry={9} fill="#F2A541" />
    </G>
  );
}

function Crown() {
  return (
    <G>
      <Path d="M44 44 L46 30 L53 38 L60 27 L67 38 L74 30 L76 44 Z" fill={GOLD} stroke="#E5B743" strokeWidth={1.2} />
      <Circle cx={60} cy={36} r={2} fill={PETAL} />
    </G>
  );
}

function Backpack() {
  return <Path d="M16 70 C12 78 12 96 20 102 L28 100 L26 68 Z" fill="#E59A5B" />;
}

function NightCap() {
  return (
    <G>
      <Path d="M34 52 C34 34 50 24 64 24 C80 24 94 32 104 50 C96 44 88 42 84 46 C85 48 86 50 86 52 Q60 44 34 52 Z" fill="#8C95E6" />
      <Path d="M33 52 Q60 43 87 52 L87 57 Q60 48 33 57 Z" fill="#FFFFFF" opacity={0.9} />
      <Circle cx={104} cy={51} r={5} fill="#FFFFFF" />
      <Circle cx={56} cy={34} r={1.4} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={72} cy={31} r={1.1} fill="#FFFFFF" opacity={0.8} />
      <Circle cx={66} cy={40} r={1.2} fill="#FFFFFF" opacity={0.8} />
    </G>
  );
}

const OPEN_EYES: Expression[] = ['idle', 'curious', 'surprised'];

function Face({ expression, blink = false }: { expression: Expression; blink?: boolean }) {
  const stroke = { stroke: INK, strokeWidth: 2.8, strokeLinecap: 'round' as const, fill: 'none' };
  const closed = blink && OPEN_EYES.includes(expression);
  const eye = (cx: number, big = false) =>
    closed ? (
      <Path d={`M${cx - 5.5} 72 Q${cx} 75.5 ${cx + 5.5} 72`} {...stroke} strokeWidth={2.4} />
    ) : (
      <G>
        <Ellipse cx={cx} cy={71} rx={big ? 8.2 : 7.4} ry={big ? 9.6 : 8.8} fill={INK} />
        <Circle cx={cx + 2.6} cy={67.4} r={big ? 3.3 : 3} fill="#FFFFFF" />
        <Circle cx={cx - 2.4} cy={74.8} r={1.4} fill="#FFFFFF" />
      </G>
    );
  const heart = (x: number, y: number, s: number) => (
    <Path d={`M${x} ${y + s * 0.3} c-${s * 0.5} -${s * 0.5} -${s} ${s * 0.1} -${s * 0.5} ${s * 0.6} l${s * 0.5} ${s * 0.5} l${s * 0.5} -${s * 0.5} c${s * 0.5} -${s * 0.5} 0 -${s * 1.1} -${s * 0.5} -${s * 0.6} z`} fill="#F0607A" />
  );
  const smile = <Path d="M54 83 Q57 86.5 60 83 Q63 86.5 66 83" {...stroke} strokeWidth={2.2} />;

  switch (expression) {
    case 'happy':
      return (
        <G>
          <Path d="M39 73 Q45 65 51 73" {...stroke} />
          <Path d="M69 73 Q75 65 81 73" {...stroke} />
          <Path d="M53 82 Q60 91 67 82 Z" fill="#E2677C" stroke={INK} strokeWidth={2} strokeLinejoin="round" />
        </G>
      );
    case 'love':
      return (
        <G>
          {heart(45, 64, 11)}
          {heart(75, 64, 11)}
          {smile}
        </G>
      );
    case 'curious':
      return (
        <G>
          {eye(45, true)}
          {eye(75, true)}
          <Path d="M68 58 Q75 54 82 58" {...stroke} strokeWidth={2.2} />
          <Circle cx={60} cy={85} r={2.8} fill={INK} />
        </G>
      );
    case 'surprised':
      return (
        <G>
          {eye(45, true)}
          {eye(75, true)}
          <Ellipse cx={60} cy={86} rx={3.6} ry={4.6} fill={INK} />
        </G>
      );
    case 'caring':
      return (
        <G>
          <Path d="M39 71 Q45 76 51 71" {...stroke} />
          <Path d="M69 71 Q75 76 81 71" {...stroke} />
          <Path d="M55 84 Q60 87.5 65 84" {...stroke} strokeWidth={2.2} />
        </G>
      );
    case 'dizzy':
      return (
        <G>
          <Path d="M45 71 m-6 0 a6 6 0 1 0 12 0 a4 4 0 1 0 -8 0 a2 2 0 1 0 4 0" {...stroke} strokeWidth={2} />
          <Path d="M75 71 m-6 0 a6 6 0 1 0 12 0 a4 4 0 1 0 -8 0 a2 2 0 1 0 4 0" {...stroke} strokeWidth={2} />
          <Path d="M52 86 Q56 82 60 86 Q64 90 68 86" {...stroke} strokeWidth={2.2} />
        </G>
      );
    case 'sleepy':
      return (
        <G>
          <Path d="M39 72 Q45 76 51 72" {...stroke} />
          <Path d="M69 72 Q75 76 81 72" {...stroke} />
          <Ellipse cx={60} cy={85} rx={2.6} ry={2.2} fill={INK} />
          <Path d="M92 50 h7 l-7 7 h7" stroke={INK} strokeWidth={1.8} fill="none" opacity={0.55} />
          <Path d="M102 40 h5 l-5 5 h5" stroke={INK} strokeWidth={1.5} fill="none" opacity={0.4} />
        </G>
      );
    default:
      return (
        <G>
          {eye(45)}
          {eye(75)}
          {smile}
        </G>
      );
  }
}
