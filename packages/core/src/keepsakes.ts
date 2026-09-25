import { detectCrisis } from './safety';
import { fold, phrase } from './text';
import type { Entry } from './types';

/*
 * Every page leaves a small keepsake on the mascot's shelf: a coffee cup for
 * the day at the café, a ticket for the concert, a raindrop for the rainy walk.
 * Over months the shelf becomes a picture of the user's life, and each object
 * opens the page it came from. Computed on the device, from the page itself.
 */

export interface Keepsake {
  glyph: string;
  label: string;
}

const RULES: { glyph: string; label: string; words: string[] }[] = [
  { glyph: '🎂', label: 'Doğum günü', words: ['dogum gunu', 'dogumgunu', 'pasta kest', 'yas gunu'] },
  { glyph: '💍', label: 'Düğün', words: ['dugun', 'nikah', 'nisan(?!li)', 'evlendi', 'kina'] },
  { glyph: '🎓', label: 'Mezuniyet', words: ['mezun', 'diploma', 'mezuniyet'] },
  { glyph: '🧳', label: 'Yolculuk', words: ['tatil', 'yolculuk', 'ucak', 'otobus', 'bavul', 'valiz', 'seyahat', 'havalimani', 'gezi'] },
  { glyph: '🎟️', label: 'Konser', words: ['konser', 'festival', 'tiyatro', 'sahne'] },
  { glyph: '🌊', label: 'Deniz', words: ['deniz', 'sahil', 'plaj', 'yuzdum'] },
  { glyph: '🌲', label: 'Doğa', words: ['orman', 'kamp', 'dag', 'doga yuruyus', 'piknik'] },
  { glyph: '❄️', label: 'Kar', words: ['kar yag', 'kardan', 'kar vardi'] },
  { glyph: '🌧️', label: 'Yağmur', words: ['yagmur', 'saganak', 'islandim'] },
  { glyph: '💌', label: 'Sevgi', words: ['sevgilim', 'askim', 'ilk bulusma', 'randevu', 'ask(?!er|i)', 'flort'] },
  { glyph: '🩹', label: 'İyileşme', words: ['hasta', 'hastane', 'doktor', 'ameliyat', 'grip', 'ates'] },
  { glyph: '📝', label: 'Sınav', words: ['sinav', 'vize', 'final', 'mulakat', 'yks', 'kpss', 'ales'] },
  { glyph: '💡', label: 'Yeni bir fikir', words: ['proje', 'fikir', 'girisim', 'plan yaptik', 'hayal'] },
  { glyph: '💼', label: 'İş günü', words: ['mesai', 'toplanti', 'is yeri', 'isyeri', 'ofis', 'patron', 'mudur', 'sunum', 'musteri', 'calisma gunu', 'calisiyorum', 'bilgisayar', 'is yuku', 'evden calis'] },
  { glyph: '👟', label: 'Hareket', words: ['kosu', 'kostum', 'spor', 'salon', 'yoga', 'pilates', 'yuruyus', 'bisiklet'] },
  { glyph: '🐈', label: 'Kedi', words: ['kedi', 'kedim', 'pisi'] },
  { glyph: '🐕', label: 'Köpek', words: ['kopek', 'kopegim'] },
  { glyph: '🎬', label: 'Film', words: ['film', 'sinema', 'dizi'] },
  { glyph: '📖', label: 'Kitap', words: ['kitap', 'roman', 'okudum'] },
  { glyph: '🎵', label: 'Müzik', words: ['muzik', 'sarki', 'gitar', 'piyano'] },
  { glyph: '🍲', label: 'Sofra', words: ['yemek yaptim', 'yemege', 'sofra', 'kahvalti', 'aksam yemegi', 'restoran', 'tarif'] },
  { glyph: '☕', label: 'Kahve', words: ['kahve', 'kafe', 'cafe'] },
  { glyph: '🫖', label: 'Çay', words: ['cay(?!ir)'] },
  { glyph: '🏠', label: 'Ev', words: ['annem', 'babam', 'ailem', 'kardesim', 'evde', 'tasindik', 'yeni ev'] },
  { glyph: '🫶', label: 'Dostluk', words: ['arkadasim', 'kanka', 'dostum', 'bulustuk', 'arkadaslarla'] },
];

// Special days (birthdays, trips, exams…) outrank everyday topics (work, coffee, home).
const SPECIAL = RULES.findIndex((r) => r.glyph === '💡');
const COMPILED = RULES.map((r, i) => ({ ...r, tier: i < SPECIAL ? 0 : 1, re: r.words.map(phrase) }));

const BY_MOOD: Record<number, Keepsake> = {
  5: { glyph: '🌟', label: 'Parlak bir gün' },
  4: { glyph: '🌼', label: 'Güzel bir gün' },
  3: { glyph: '🍃', label: 'Sakin bir gün' },
  2: { glyph: '☁️', label: 'Bulutlu bir gün' },
  1: { glyph: '🕯️', label: 'Zor bir gün' },
};

export function keepsakeFor(entry: Pick<Entry, 'text' | 'mood' | 'privacy' | 'kind' | 'photos'>): Keepsake {
  // Heavy pages get a quiet candle, never a cheerful object.
  if (detectCrisis(entry.text).level !== 'none') return { glyph: '🕯️', label: 'Zor bir gün' };
  if (entry.kind === 'entry') {
    const t = fold(entry.text);
    // The topic the page talks about most wins; a special day gets a small head start.
    // Ties go to whatever comes first, which is usually what the day was about.
    let best: { k: Keepsake; score: number; at: number } | null = null;
    for (const r of COMPILED) {
      let hits = 0;
      let at = Infinity;
      for (const re of r.re) {
        const g = new RegExp(re.source, 'gi');
        for (const m of t.matchAll(g)) {
          hits++;
          at = Math.min(at, m.index ?? Infinity);
        }
      }
      if (!hits) continue;
      const score = hits + (r.tier === 0 ? 0.5 : 0);
      if (!best || score > best.score || (score === best.score && at < best.at)) best = { k: { glyph: r.glyph, label: r.label }, score, at };
    }
    if (best && !(entry.mood === 1 && ['🎂', '🎟️', '🌟'].includes(best.k.glyph))) return best.k;
  }
  if (entry.photos.length) return { glyph: '🖼️', label: 'Bir fotoğraf' };
  return BY_MOOD[entry.mood ?? 3] ?? BY_MOOD[3];
}
