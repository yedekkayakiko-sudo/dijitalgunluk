import { fold, lower, matchAny, phrase } from './text';

/*
 * Rule-based safety filters. They run on the device before anything is sent
 * to the AI, and again on the server. They are deliberately over-inclusive:
 * a false positive costs a gentle resource card, a false negative costs far more.
 */

// All patterns are written in folded form (see text.fold): ş→s, ı→i, ö→o ...
const ACUTE = [
  'intihar',
  'kendimi asa',
  'olmek istiyorum',
  'olsem daha iyi',
  'yasamak istemiyorum',
  'yasamanin anlami yok',
  'canima kiy',
  'hayatima son',
  'kendime zarar',
  'bileklerimi kes',
  'bilegimi kes',
  'kendimi kes',
  'hap icip',
  'yok olmak istiyorum',
  'artik burada olmak istemiyorum',
  'keske hic dogmasaydim',
  'herkes bensiz daha iyi',
].map(phrase);

// Words where folding is ambiguous (öldür/oldur, ölüp/olup): matched on the unfolded text.
const ACUTE_EXACT = ['kendimi öldür', 'ölüp gitsem', 'ölsem', 'ölmek isti'].map(phrase);

const CONCERN = [
  'artik dayanamiyorum',
  'her sey bitsin',
  'beni kimse ozlemez',
  'kimse fark etmez',
  'cok umutsuz',
  'hicbir cikis yok',
  'kacip gitmek istiyorum',
  'uyuyup uyanmamak',
].map(phrase);

export type CrisisLevel = 'none' | 'concern' | 'acute';

export interface CrisisResult {
  level: CrisisLevel;
  matched: string[];
}

export function detectCrisis(text: string): CrisisResult {
  const t = fold(text);
  const acute = [...matchAny(t, ACUTE), ...matchAny(lower(text), ACUTE_EXACT)];
  if (acute.length) return { level: 'acute', matched: acute.map((s) => s.trim()) };
  const concern = matchAny(t, CONCERN);
  if (concern.length) return { level: 'concern', matched: concern.map((s) => s.trim()) };
  return { level: 'none', matched: [] };
}

/**
 * Crisis resources shown to the user. Numbers must be re-verified before each
 * store release (see docs/PLAY_STORE.md).
 */
export const CRISIS_RESOURCES = [
  { label: 'Acil Çağrı Merkezi', phone: '112', note: 'Kendini güvende hissetmiyorsan hemen ara. 7/24, ücretsiz.' },
  { label: 'ALO 183 Sosyal Destek Hattı', phone: '183', note: 'Aile, Kadın, Çocuk ve Sosyal Hizmetler danışma hattı.' },
  { label: 'Güvendiğin biri', phone: null, note: 'Bir arkadaşına, aile üyene ya da bir uzmana şu an ulaşmak iyi gelebilir.' },
] as const;

// "Serious" topics: the alternate-scenario game is disabled for these entries.
const SERIOUS = [
  // ayrılık
  'ayrildik', 'ayrildi', 'ayrilik', 'bosan', 'terk etti', 'beni birakti', 'aldatt',
  // kayıp / ölüm
  'vefat', 'cenaze', 'kaybettim', 'kaybettik', 'rahmetli', 'yas tut', 'mezar',
  'dusuk yaptim', 'bebegi kaybet',
  // sağlık
  'kanser', 'teshis', 'ameliyat', 'yogun bakim', 'hastaneye kaldir', 'tumor', 'kemoterapi',
  // pişmanlık
  'pisman', 'kendimi affedemi', 'keske hic', 'hayatimin hatasi',
  // şiddet / güvenlik
  'siddet', 'taciz', 'tecavuz', 'dayak', 'tehdit', 'saldiri',
  // iş / maddi kriz
  'kovuldum', 'isten cikarildim', 'isimi kaybettim', 'iflas', 'borc bata',
  // kaza / afet
  'kaza(?!n)', 'deprem', 'yangin',
].map(phrase);

const SERIOUS_EXACT = ['öldü', 'ölmüş', 'ölüm', 'kaybettiğim'].map(phrase);

export type Severity = 'light' | 'serious';

export function classifySeverity(text: string): Severity {
  if (detectCrisis(text).level !== 'none') return 'serious';
  const hits = matchAny(fold(text), SERIOUS).length + matchAny(lower(text), SERIOUS_EXACT).length;
  return hits ? 'serious' : 'light';
}

// Diagnostic / labelling language the mascot must never use about the user.
const DIAGNOSTIC = [
  'depresyon',
  'depresif',
  'anksiyete',
  'kaygi bozuklu',
  'panik atak geciriyorsun',
  'bipolar',
  'travma sonrasi',
  'ptsd',
  'obsesif',
  'okb',
  'dehb',
  'borderline',
  'narsist',
  'ruh halin bozuk',
  'psikolojin bozuk',
  'psikolojik sorun',
  'ruhsal bozukluk',
  'hastasin',
  'teshis',
  'tani koy',
  'klinik',
  'ilac kullanmalisin',
  'ilac almalisin',
].map(phrase);

/**
 * Checks AI output before it is shown. Returns false if the text uses
 * diagnostic language; callers then fall back to a safe template.
 */
export function isSafeMascotText(text: string): boolean {
  return matchAny(fold(text), DIAGNOSTIC).length === 0;
}
