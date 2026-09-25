import { emotionalTone, type Mood } from '@gunluk/core';
import * as Haptics from 'expo-haptics';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Pressable, View } from 'react-native';
import { usePet } from '@/lib/pet';
import { space, useColors } from '@/theme';
import { Mascot, type Expression } from './Mascot';
import { T } from './ui';

const HINTS = [
  'Bugün seni en çok ne şaşırttı?',
  'Şu an bulunduğun yeri üç kelimeyle anlat.',
  'Bugün biriyle yaşadığın küçük bir an…',
  'Bugün vücudun nasıldı: yorgun mu, hafif mi?',
  'Bugünün en sessiz anı neydi?',
  'Yarın için kendine ne söylemek istersin?',
];

/**
 * The mascot keeps you company while you write: curious as you type, happy as
 * the page grows, gentle when the page is heavy. Tap it when you're stuck.
 */
export function WritingBuddy({ text, mood }: { text: string; mood: Mood | null }) {
  const c = useColors();
  const { info } = usePet();
  const [typing, setTyping] = useState(false);
  const [say, setSay] = useState<string | null>(null);
  const milestones = useRef(new Set<number>());
  const first = useRef(true);

  const words = useMemo(() => text.split(/\s+/).filter(Boolean).length, [text]);
  const heavy = useMemo(() => emotionalTone(text).negative >= 0.45, [text]);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setTyping(true);
    const t = setTimeout(() => setTyping(false), 1200);
    return () => clearTimeout(t);
  }, [text]);

  useEffect(() => {
    const cross = (n: number, line: string) => {
      if (words >= n && !milestones.current.has(n)) {
        milestones.current.add(n);
        setSay(line);
        Haptics.selectionAsync().catch(() => {});
      }
    };
    cross(80, 'Derinden yazıyorsun. Bu sayfa bağımızı daha da güçlendirecek.');
    cross(150, 'Nasıl da akıyor… Okumaya bayılıyorum. 💗');
    cross(300, 'Vay! Bugün anlatacak çok şey var. Buradayım.');
  }, [words]);

  useEffect(() => {
    if (!say) return;
    const t = setTimeout(() => setSay(null), 3200);
    return () => clearTimeout(t);
  }, [say]);

  const expression: Expression =
    heavy || (mood != null && mood <= 2) ? 'caring' : words >= 150 ? 'love' : words >= 50 || (mood != null && mood >= 4) ? 'happy' : typing ? 'curious' : 'idle';

  return (
    <View pointerEvents="box-none" style={{ position: 'absolute', right: space.s, bottom: space.s, alignItems: 'flex-end', maxWidth: 240 }}>
      {say ? (
        <View style={{ backgroundColor: c.card, borderColor: c.border, borderWidth: 1, borderRadius: 14, borderBottomRightRadius: 4, padding: space.s, marginBottom: 4 }}>
          <T v="small" style={{ color: c.text }}>{say}</T>
        </View>
      ) : null}
      <Pressable
        onPress={() => setSay(`Takıldıysan: ${HINTS[Math.floor(Math.random() * HINTS.length)]}`)}
        accessibilityRole="button"
        accessibilityLabel="Maskottan bir soru iste">
        <Mascot size={54} expression={expression} look={info.look} />
      </Pressable>
    </View>
  );
}
