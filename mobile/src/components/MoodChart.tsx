import { MOODS, type MoodPoint } from '@gunluk/core';
import { useState } from 'react';
import { View } from 'react-native';
import Svg, { Circle, Line, Path } from 'react-native-svg';
import { space, useColors } from '@/theme';
import { T } from './ui';

/** Simple mood trend line. A visualisation only: no scores, no interpretation. */
export function MoodChart({ points }: { points: MoodPoint[] }) {
  const c = useColors();
  const [width, setWidth] = useState(0);
  const height = 140;
  const padX = 28, padY = 14;

  if (points.length < 2) return <T v="muted">Grafik için birkaç gün ruh hali seçmen yeterli.</T>;

  const x = (i: number) => padX + (i * (width - padX - 8)) / Math.max(1, points.length - 1);
  const y = (v: number) => padY + ((5 - v) * (height - 2 * padY)) / 4;
  const d = points.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p.average).toFixed(1)}`).join(' ');

  return (
    <View onLayout={(e) => setWidth(e.nativeEvent.layout.width)} style={{ gap: space.xs }}>
      {width > 0 ? (
        <Svg width={width} height={height} accessibilityLabel="Ruh hali grafiği">
          {[1, 3, 5].map((v) => (
            <Line key={v} x1={padX} x2={width - 8} y1={y(v)} y2={y(v)} stroke={c.border} strokeDasharray="4 6" />
          ))}
          <Path d={d} stroke={c.accent} strokeWidth={2.5} fill="none" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((p, i) => (
            <Circle key={p.key} cx={x(i)} cy={y(p.average)} r={3.5} fill={c.mood[Math.round(p.average) - 1]} stroke={c.card} strokeWidth={1.5} />
          ))}
        </Svg>
      ) : null}
      <View style={{ position: 'absolute', left: 0, top: 0, height, justifyContent: 'space-between', paddingVertical: padY - 10 }}>
        <T v="small">{MOODS[4].emoji}</T>
        <T v="small">{MOODS[2].emoji}</T>
        <T v="small">{MOODS[0].emoji}</T>
      </View>
    </View>
  );
}
