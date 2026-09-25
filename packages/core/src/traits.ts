import { fold, phrase } from './text';
import type { Entry } from './types';

/*
 * The mascot takes after its person. What the user writes about, and when,
 * gives it small traits with a visible prop: a moon for a night owl, a cup for
 * a coffee lover, a backpack for a traveller. Traits come and go as life does.
 */

export type TraitId =
  | 'night_owl' | 'early_bird' | 'coffee' | 'tea' | 'bookworm' | 'music' | 'traveler' | 'social'
  | 'athlete' | 'nature' | 'animals' | 'dreamer' | 'storyteller' | 'foodie' | 'cinephile';

export interface Trait {
  id: TraitId;
  label: string;
  glyph: string;
  /** Why the mascot has it, in its own words. */
  why: string;
}

const TOPICS: { id: TraitId; label: string; glyph: string; why: string; words: string[] }[] = [
  { id: 'coffee', label: 'Kahve tiryakisi', glyph: '☕', why: 'Sayfalarında kahve hiç eksik olmuyor, ben de bir fincan edindim.', words: ['kahve', 'espresso', 'latte', 'filtre kahve', 'turk kahvesi'] },
  { id: 'tea', label: 'Çaycı', glyph: '🫖', why: 'Çaysız sayfan yok gibi; ben de demliğimi kaptım.', words: ['cay(?!ir)', 'demlik', 'bitki cayi'] },
  { id: 'bookworm', label: 'Kitap kurdu', glyph: '📖', why: 'Okuduklarını anlatıyorsun, ben de kitaba merak sardım.', words: ['kitap', 'okudum', 'okuyorum', 'roman', 'sayfa okudum'] },
  { id: 'music', label: 'Müzik ruhlu', glyph: '🎵', why: 'Sayfalarından şarkılar taşıyor.', words: ['muzik', 'sarki', 'konser', 'playlist', 'gitar', 'piyano', 'dinledim'] },
  { id: 'athlete', label: 'Hareketli', glyph: '👟', why: 'Koşudan, yürüyüşten bahsediyorsun; ben de ısınıyorum.', words: ['spor', 'kosu', 'kostum', 'yuruyus', 'yurudum', 'salon', 'antrenman', 'yoga', 'pilates', 'bisiklet', 'yuzme'] },
  { id: 'nature', label: 'Doğa sever', glyph: '🌿', why: 'Deniz, orman, park… Sen doğaya çıktıkça ben yeşilleniyorum.', words: ['deniz', 'orman', 'park', 'doga', 'dag', 'sahil', 'kamp', 'gol kenari', 'bahce'] },
  { id: 'animals', label: 'Pati dostu', glyph: '🐾', why: 'Bir kedi ya da köpek sık sık sayfana giriyor.', words: ['kedi', 'kopek', 'kopegim', 'kedim', 'pati', 'yavru kedi'] },
  { id: 'foodie', label: 'Lezzet avcısı', glyph: '🍜', why: 'Yemeklerini öyle güzel anlatıyorsun ki acıktım.', words: ['yemek yaptim', 'tarif', 'restoran', 'lezzet', 'pisirdim', 'kahvalti', 'tatli yedik'] },
  { id: 'cinephile', label: 'Film gurmesi', glyph: '🎬', why: 'Film ve dizi sohbetlerin bitmiyor.', words: ['film', 'dizi', 'sinema', 'bolum izledim', 'izledim'] },
  { id: 'dreamer', label: 'Hayalperest', glyph: '✨', why: 'Hep ileriye, hayallere dair yazıyorsun.', words: ['hayal', 'hayalim', 'hedefim', 'bir gun', 'planliyorum', 'proje'] },
];

const PATTERNS = TOPICS.map((t) => ({ ...t, re: t.words.map(phrase) }));

export const TRAIT_INFO: Record<TraitId, Omit<Trait, 'id'>> = {
  ...Object.fromEntries(TOPICS.map((t) => [t.id, { label: t.label, glyph: t.glyph, why: t.why }])),
  night_owl: { label: 'Gece kuşu', glyph: '🌙', why: 'Sayfalarının çoğunu geceleri yazıyorsun; ben de gece kuşu oldum.' },
  early_bird: { label: 'Erkenci', glyph: '🌅', why: 'Sabahın erken saatlerinde yazıyorsun; ben de erkenden uyanıyorum.' },
  traveler: { label: 'Gezgin', glyph: '🎒', why: 'Farklı yerlerden yazıyorsun, ben de çantamı hazırladım.' },
  social: { label: 'Kalabalık kalpli', glyph: '🫶', why: 'Hayatında çok sevdiğin insan var; sayfaların hep dolu.' },
  storyteller: { label: 'Hikâye anlatıcı', glyph: '🪶', why: 'Uzun uzun, derinden yazıyorsun. Seni okumak çok güzel.' },
} as Record<TraitId, Omit<Trait, 'id'>>;

export interface TraitInput {
  entries: Pick<Entry, 'text' | 'createdAt' | 'kind' | 'privacy'>[];
  distinctPeople: number;
  distinctPlaces: number;
}

/** Up to `max` traits, strongest first. Needs a handful of pages before saying anything. */
export function traitsFor(input: TraitInput, max = 3): Trait[] {
  const recent = input.entries.slice(0, 60);
  if (recent.length < 4) return [];
  const scores: { id: TraitId; score: number }[] = [];
  const share = (n: number) => n / recent.length;

  const hours = recent.map((e) => new Date(e.createdAt).getHours());
  const night = share(hours.filter((h) => h >= 22 || h < 4).length);
  const early = share(hours.filter((h) => h >= 5 && h < 9).length);
  if (night >= 0.4) scores.push({ id: 'night_owl', score: night * 10 });
  if (early >= 0.4) scores.push({ id: 'early_bird', score: early * 10 });

  // Topics only from pages the user lets the mascot analyse. Private pages stay unread.
  const readable = recent.filter((e) => e.privacy === 'ai_full');
  for (const t of PATTERNS) {
    const hits = readable.filter((e) => t.re.some((r) => r.test(fold(e.text)))).length;
    if (hits >= 3 && hits / Math.max(readable.length, 1) >= 0.15) scores.push({ id: t.id, score: hits / Math.max(readable.length, 1) * 8 + hits * 0.2 });
  }

  if (input.distinctPlaces >= 4) scores.push({ id: 'traveler', score: 2 + input.distinctPlaces * 0.2 });
  if (input.distinctPeople >= 6) scores.push({ id: 'social', score: 2 + input.distinctPeople * 0.15 });
  const long = recent.filter((e) => e.kind === 'entry' && e.text.split(/\s+/).length >= 150).length;
  if (share(long) >= 0.35) scores.push({ id: 'storyteller', score: share(long) * 7 });

  return scores
    .sort((a, b) => b.score - a.score)
    .slice(0, max)
    .map(({ id }) => ({ id, ...TRAIT_INFO[id] }));
}
