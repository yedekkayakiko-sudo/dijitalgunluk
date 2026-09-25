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

// Figurative Turkish: "gülmekten öldüm", "utançtan ölmek istiyorum", "sıcaktan ölüyorum".
// An ablative noun right before "öl-" is almost always hyperbole, so it is removed before matching.
// Adverbs that merely look ablative ("gerçekten ölmek istiyorum") are real intent and are kept.
const FIGURATIVE_EXACT = /([a-zçğıöşüâîû]+)(dan|den|tan|ten)\s+öl[a-zçğıöşü]*/g;
const FIGURATIVE_FOLDED = /([a-z]+)(dan|den|tan|ten)\s+ol(mek|sem|ecek|uyor|dum)[a-z]*/g;
const NOT_ABLATIVE = new Set(['gercek', 'gerçek', 'cid', 'sahi', 'yeni', 'bir', 'iç', 'ic', 'esasın', 'esasin', 'en']);

const stripFigurative = (text: string, re: RegExp) =>
  text.replace(re, (m, stem: string) => (NOT_ABLATIVE.has(stem) ? m : ' '));

export function detectCrisis(text: string): CrisisResult {
  const t = stripFigurative(fold(text), FIGURATIVE_FOLDED);
  const exact = stripFigurative(lower(text), FIGURATIVE_EXACT);
  const acute = [...matchAny(t, ACUTE), ...matchAny(exact, ACUTE_EXACT)];
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

/** For long heavy periods: a gentle pointer to professional help, never a diagnosis. */
export const PROFESSIONAL_SUPPORT =
  'Bir uzmanla konuşmak için aile hekimine gidebilir ya da ALO 182 / MHRS üzerinden psikiyatri veya psikolojik danışmanlık randevusu alabilirsin. Üniversitedeysen okulunun psikolojik danışma merkezi de ücretsizdir.';

// Topic categories, used to decide how (and whether) the alternate-scenario game may be played.

// Never played: grief, violence and abuse, serious illness, accidents. Counterfactuals here feed self-blame.
const BLOCKED = [
  'vefat', 'cenaze', 'kaybettim', 'kaybettik', 'rahmetli', 'yas tut', 'mezar', 'dusuk yaptim', 'bebegi kaybet',
  'kanser', 'teshis', 'ameliyat', 'yogun bakim', 'hastaneye kaldir', 'tumor', 'kemoterapi',
  'siddet', 'taciz', 'tecavuz', 'istismar', 'dayak', 'tehdit', 'saldiri', 'darp',
  'kaza(?!n)', 'deprem', 'yangin',
].map(phrase);
const BLOCKED_EXACT = ['öldü', 'ölmüş', 'ölüm', 'kaybettiğim'].map(phrase);

// Heartache: breakups, regret, lost chances. Played in a careful, agency-restoring way.
const HEARTACHE = [
  'ayrildik', 'ayrildi', 'ayrilik', 'ayrilmak', 'bosan', 'terk etti', 'beni birakti', 'aldatt', 'eski sevgili', 'eskisevgili',
  'pisman', 'keske', 'kendimi affedemi', 'hayatimin hatasi', 'hata yaptim', 'yanlis karar',
  'kovuldum', 'isten cikarildim', 'isimi kaybettim', 'iflas', 'borc bata', 'kaybettim firsat', 'firsati kacir', 'reddedildim',
  'sinavi kaybettim', 'sinavdan kaldim', 'kazanamadim',
].map(phrase);

export type Topic = 'light' | 'heartache' | 'blocked';

export function classifyTopic(text: string): Topic {
  if (detectCrisis(text).level !== 'none') return 'blocked';
  const t = fold(text);
  if (matchAny(t, BLOCKED).length || matchAny(lower(text), BLOCKED_EXACT).length) return 'blocked';
  return matchAny(t, HEARTACHE).length ? 'heartache' : 'light';
}

export type Severity = 'light' | 'serious';

export function classifySeverity(text: string): Severity {
  return classifyTopic(text) === 'light' ? 'light' : 'serious';
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
