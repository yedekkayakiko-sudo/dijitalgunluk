import Svg, { Circle, Path, Rect } from 'react-native-svg';

/* A few quiet line icons, drawn here so they look the same on every phone. */

export type IconName = 'today' | 'calendar' | 'chat' | 'me' | 'shelf' | 'spark' | 'lock' | 'target' | 'letter' | 'breath' | 'moon' | 'share' | 'chevron' | 'pen';

export function Icon({ name, size = 22, color, strokeWidth = 1.8 }: { name: IconName; size?: number; color: string; strokeWidth?: number }) {
  const p = { stroke: color, strokeWidth, fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {name === 'today' ? (
        <>
          <Path d="M12 21v-8" {...p} />
          <Path d="M12 13c0-4 3-6 7-6 0 4-3 6-7 6z" {...p} />
          <Path d="M12 15c0-3-2.5-5-6-5 0 3 2.5 5 6 5z" {...p} />
          <Path d="M7 21h10" {...p} />
        </>
      ) : name === 'calendar' ? (
        <>
          <Rect x={3.5} y={5} width={17} height={15.5} rx={3} {...p} />
          <Path d="M3.5 10h17M8 3v4M16 3v4" {...p} />
        </>
      ) : name === 'chat' ? (
        <Path d="M4 12c0-4.4 3.6-7.5 8-7.5s8 3.1 8 7.5-3.6 7.5-8 7.5c-1.3 0-2.5-.2-3.6-.7L4.5 20l1.1-3.6C4.6 15.1 4 13.6 4 12z" {...p} />
      ) : name === 'me' ? (
        <>
          <Circle cx={12} cy={8.5} r={3.8} {...p} />
          <Path d="M4.5 20.5c1.2-3.8 4.2-5.6 7.5-5.6s6.3 1.8 7.5 5.6" {...p} />
        </>
      ) : name === 'shelf' ? (
        <>
          <Path d="M3 9.5h18M3 18.5h18" {...p} />
          <Rect x={5} y={4} width={3.5} height={5.5} rx={1} {...p} />
          <Circle cx={14} cy={7} r={2.5} {...p} />
          <Rect x={10} y={13} width={4} height={5.5} rx={1} {...p} />
        </>
      ) : name === 'spark' ? (
        <Path d="M12 3c.6 4.3 2.7 6.4 7 7-4.3.6-6.4 2.7-7 7-.6-4.3-2.7-6.4-7-7 4.3-.6 6.4-2.7 7-7z" {...p} />
      ) : name === 'lock' ? (
        <>
          <Rect x={5} y={10.5} width={14} height={10} rx={2.5} {...p} />
          <Path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" {...p} />
        </>
      ) : name === 'target' ? (
        <>
          <Circle cx={12} cy={12} r={8} {...p} />
          <Circle cx={12} cy={12} r={4} {...p} />
          <Circle cx={12} cy={12} r={0.8} fill={color} stroke={color} />
        </>
      ) : name === 'letter' ? (
        <>
          <Rect x={3.5} y={6} width={17} height={12.5} rx={2.5} {...p} />
          <Path d="M4 7l8 6 8-6" {...p} />
        </>
      ) : name === 'breath' ? (
        <Path d="M3 9h11a3 3 0 1 0-3-3M3 15h15a3 3 0 1 1-3 3M3 12h8" {...p} />
      ) : name === 'moon' ? (
        <Path d="M19 14.5A7.5 7.5 0 0 1 9.5 5a7.5 7.5 0 1 0 9.5 9.5z" {...p} />
      ) : name === 'share' ? (
        <>
          <Path d="M12 15V4M8 8l4-4 4 4" {...p} />
          <Path d="M5 13v5.5A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5V13" {...p} />
        </>
      ) : name === 'chevron' ? (
        <Path d="M9 5l7 7-7 7" {...p} />
      ) : (
        <Path d="M4 20l1-4L16 5l3 3L8 19l-4 1zM14 7l3 3" {...p} />
      )}
    </Svg>
  );
}
