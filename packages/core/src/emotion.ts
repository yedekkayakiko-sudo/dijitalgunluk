import { fold, matchAny, phrase } from './text';

/*
 * Lightweight lexicon analysis. It never labels the user; it only produces
 * observable signals ("the word 'yorgun' appears often") that the reaction
 * engine can turn into open-ended questions.
 */

/** Theme id → Turkish display name and folded word-start patterns. */
export const THEMES: Record<string, { label: string; words: string[] }> = {
  is: { label: 'iş', words: ['is yeri', 'isyeri', 'iste yorul', 'isten cik', 'isten sonra', 'mesai', 'patron', 'mudur', 'toplanti', 'proje', 'maas', 'terfi', 'ofis'] },
  okul: { label: 'okul ve dersler', words: ['okul', 'sinav', 'ders', 'odev', 'universite', 'hoca', 'vize', 'final', 'not ortalam'] },
  aile: { label: 'aile', words: ['annem', 'babam', 'kardes', 'ablam', 'abim', 'ailem', 'anneanne', 'babaanne', 'dedem', 'teyze', 'amca', 'halam', 'dayi'] },
  arkadaslik: { label: 'arkadaşlık', words: ['arkadas', 'kanka', 'dostum', 'bulustuk', 'takildik'] },
  iliski: { label: 'ilişki', words: ['sevgili', 'flort', 'ask(?!er|i)', 'askim', 'iliskim', 'nisanli', 'esim', 'kocam', 'karim', 'randevu'] },
  yorgunluk: { label: 'yorgunluk ve uyku', words: ['yorgun', 'yoruldum', 'bitkin', 'uykusuz', 'uyuyamadim', 'uyku', 'tukendim'] },
  endise: { label: 'endişe', words: ['endise', 'kaygilan', 'gergin', 'stres', 'korkuyorum', 'tedirgin', 'huzursuz'] },
  yalnizlik: { label: 'yalnızlık', words: ['yalniz', 'kimsesiz', 'kimse yok', 'tek basima'] },
  saglik: { label: 'sağlık', words: ['hasta', 'doktor', 'agri', 'bas agri', 'grip', 'ates'] },
  para: { label: 'para', words: ['para(?!m)', 'borc', 'kira(?!z)', 'fatura', 'harcama', 'butce'] },
  hareket: { label: 'spor ve hareket', words: ['spor', 'kosu', 'kostum', 'yuruyus', 'salon', 'antrenman', 'yoga'] },
  keyif: { label: 'küçük keyifler', words: ['kahve', 'film', 'dizi', 'kitap', 'muzik', 'konser', 'yemek yaptim'] },
};

const THEME_PATTERNS = Object.fromEntries(
  Object.entries(THEMES).map(([id, t]) => [id, t.words.map(phrase)]),
) as Record<string, RegExp[]>;

export function extractThemes(text: string): string[] {
  const t = fold(text);
  return Object.keys(THEME_PATTERNS).filter((id) => matchAny(t, THEME_PATTERNS[id]).length > 0);
}

const NEGATIVE = [
  'agladim', 'agliyorum', 'aglamak', 'mahvoldum', 'berbat', 'nefret', 'cok kotu', 'cok uzgun', 'uzgunum',
  'kirildim', 'kirgin', 'ofkeli', 'sinirliyim', 'patladim', 'bunaldim', 'daraldim', 'bogul', 'yikildim',
  'dayanamiyorum', 'cok yalniz', 'bikt', 'usandim', 'caresiz', 'panik', 'titriyorum', 'hayal kirikli', 'bos hissed',
].map(phrase);

const POSITIVE = [
  'harika', 'muhtesem', 'inanilmaz guzel', 'cok mutlu', 'mutluyum', 'ucuyorum', 'hayatimin en guzel', 'cok guzel',
  'basardim', 'kazandim', 'gurur duy', 'heyecanli', 'sahane', 'bayildim', 'cok eglen', 'kahkaha',
].map(phrase);

const INTENSIFIERS = ['cok', 'asiri', 'fazlasiyla', 'resmen', 'hic', 'gercekten', 'inanilmaz'].map(phrase);

export interface EmotionalTone {
  /** 0..1 overall charge */
  intensity: number;
  /** 0..1 weight of hard feelings */
  negative: number;
  /** 0..1 weight of joyful feelings */
  positive: number;
}

/**
 * How emotionally charged the text reads, and in which direction. Not a
 * judgement, just a signal for when a friendly word might be welcome.
 */
export function emotionalTone(text: string): EmotionalTone {
  const t = fold(text);
  const neg = Math.min(matchAny(t, NEGATIVE).length, 4);
  const pos = Math.min(matchAny(t, POSITIVE).length, 4);
  let boost = Math.min(matchAny(t, INTENSIFIERS).length, 3) * 0.07;
  boost += Math.min((text.match(/!/g) ?? []).length, 3) * 0.05;
  if (text.match(/\b[A-ZÇĞİÖŞÜ]{4,}\b/g)) boost += 0.1;
  const negative = neg ? Math.min(1, neg * 0.25 + boost) : 0;
  const positive = pos ? Math.min(1, pos * 0.25 + boost) : 0;
  return { intensity: Math.min(1, (neg + pos) * 0.2 + boost), negative, positive };
}

export function emotionalIntensity(text: string): number {
  return emotionalTone(text).intensity;
}
