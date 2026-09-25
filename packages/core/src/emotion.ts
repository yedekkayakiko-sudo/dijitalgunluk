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

const HEAVY = [
  'agladim', 'agliyorum', 'aglamak', 'mahvoldum', 'berbat', 'nefret', 'cok kotu', 'cok uzgun',
  'kirildim', 'kirgin', 'ofkeli', 'sinirliyim', 'patladim', 'bunaldim', 'daraldim', 'bogul',
  'dayanamiyorum', 'cok yalniz', 'bikt', 'usandim', 'caresiz', 'panik', 'titriyorum',
  'harika', 'muhtesem', 'inanilmaz', 'cok mutlu', 'ucuyorum', 'hayatimin en',
].map(phrase);

const INTENSIFIERS = ['cok', 'asiri', 'fazlasiyla', 'resmen', 'hic', 'gercekten', 'inanilmaz'].map(phrase);

/**
 * 0..1 score of how emotionally charged the text reads. Not a judgement,
 * just a signal for when an observational comment might be welcome.
 */
export function emotionalIntensity(text: string): number {
  const t = fold(text);
  let score = 0;
  score += Math.min(matchAny(t, HEAVY).length, 4) * 0.2;
  score += Math.min(matchAny(t, INTENSIFIERS).length, 3) * 0.07;
  score += Math.min((text.match(/!/g) ?? []).length, 3) * 0.05;
  const shouting = text.match(/\b[A-ZÇĞİÖŞÜ]{4,}\b/g);
  if (shouting) score += 0.1;
  return Math.min(1, score);
}
