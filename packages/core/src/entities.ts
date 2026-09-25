import { AMBIGUOUS_NAMES, FIRST_NAMES, FUNCTION_WORDS, NOT_PEOPLE, PLACES, TITLE_WORDS } from './names';
import { fold, stripSuffix } from './text';
import type { Entity, EntityKind } from './types';

/**
 * On-device, rule-based name detection for Turkish. When the entry's privacy
 * level allows full analysis, the server's AI extraction is merged on top.
 */

export interface EntityMention {
  kind: EntityKind;
  name: string;
  key: string;
}

export function normalizeKey(name: string): string {
  return fold(name).replace(/[^a-z0-9 ]/g, '').trim();
}

/*
 * Relationship words, written as the diary author uses them ("annem",
 * "kız kardeşimle", "en yakın arkadaşımın"). A modifier makes a generic word
 * specific enough to remember: "arkadaşım" alone is too vague, "en yakın
 * arkadaşım" is one person.
 */
interface Relation {
  /** Folded possessive stem, matched at a word start with up to a few suffix letters. */
  stem: string;
  label: string;
  /** Needs one of these (folded) modifiers right before it; otherwise uses `label`. */
  modifiers?: Record<string, string>;
  /** Without a modifier, is the bare word worth remembering? */
  standalone?: boolean;
}

const RELATIONS: Relation[] = [
  { stem: 'annem', label: 'Annem', standalone: true },
  { stem: 'babam', label: 'Babam', standalone: true },
  { stem: 'ablam', label: 'Ablam', standalone: true },
  { stem: 'abim', label: 'Abim', standalone: true },
  { stem: 'kardesim', label: 'Kardeşim', standalone: true, modifiers: { kiz: 'Kız kardeşim', erkek: 'Erkek kardeşim', kucuk: 'Küçük kardeşim', buyuk: 'Büyük kardeşim' } },
  { stem: 'anneannem', label: 'Anneannem', standalone: true },
  { stem: 'babaannem', label: 'Babaannem', standalone: true },
  { stem: 'dedem', label: 'Dedem', standalone: true },
  { stem: 'ninem', label: 'Ninem', standalone: true },
  { stem: 'teyzem', label: 'Teyzem', standalone: true },
  { stem: 'halam', label: 'Halam', standalone: true },
  { stem: 'dayim', label: 'Dayım', standalone: true },
  { stem: 'amcam', label: 'Amcam', standalone: true },
  { stem: 'yengem', label: 'Yengem', standalone: true },
  { stem: 'enistem', label: 'Eniştem', standalone: true },
  { stem: 'kuzenim', label: 'Kuzenim', standalone: true },
  { stem: 'yegenim', label: 'Yeğenim', standalone: true },
  { stem: 'esim', label: 'Eşim', standalone: true },
  { stem: 'sevgilim', label: 'Sevgilim', standalone: true, modifiers: { eski: 'Eski sevgilim' } },
  { stem: 'eski esim', label: 'Eski eşim', standalone: true },
  { stem: 'nisanlim', label: 'Nişanlım', standalone: true },
  { stem: 'kocam', label: 'Kocam', standalone: true },
  { stem: 'karim', label: 'Karım', standalone: true },
  { stem: 'oglum', label: 'Oğlum', standalone: true },
  { stem: 'kizim', label: 'Kızım', standalone: true },
  { stem: 'kayinvalidem', label: 'Kayınvalidem', standalone: true },
  { stem: 'kaynanam', label: 'Kaynanam', standalone: true },
  { stem: 'kayinpederim', label: 'Kayınpederim', standalone: true },
  { stem: 'patronum', label: 'Patronum', standalone: true },
  { stem: 'mudurum', label: 'Müdürüm', standalone: true },
  { stem: 'yoneticim', label: 'Yöneticim', standalone: true },
  { stem: 'terapistim', label: 'Terapistim', standalone: true },
  { stem: 'komsum', label: 'Komşum', standalone: false, modifiers: { 'alt kat': 'Alt kat komşum', 'ust kat': 'Üst kat komşum', 'yan': 'Yan komşum' } },
  {
    stem: 'arkadasim', label: 'Arkadaşım', standalone: false,
    modifiers: {
      'en yakin': 'En yakın arkadaşım', 'en iyi': 'En iyi arkadaşım', 'yakin': 'Yakın arkadaşım', 'is': 'İş arkadaşım',
      'ev': 'Ev arkadaşım', 'oda': 'Oda arkadaşım', 'cocukluk': 'Çocukluk arkadaşım', 'okul': 'Okul arkadaşım',
      'sinif': 'Sınıf arkadaşım', 'kiz': 'Kız arkadaşım', 'erkek': 'Erkek arkadaşım', 'eski': 'Eski arkadaşım',
    },
  },
];

// Suffixes that may follow a possessive relation word: -la, -ın, -a, -dan, -le+ydim…
const REL_SUFFIX = '(?:[a-z]{0,8})';

// Words that, right after a capitalised sentence-initial word, strongly suggest it is a name.
const NAME_FOLLOWERS = new Set(['ile', 've', 'bana', 'beni', 'benimle', 'bugun', 'dun', 'aradi', 'geldi', 'dedi', 'yazdi', 'soyledi', 'gitti', 'sordu', 'anlatti']);

const HONORIFICS = new Set(['bey', 'hanim', 'hoca', 'hocam', 'abi', 'abla', 'teyze', 'amca', 'dayi', 'bay', 'bayan']);

const WORD = /[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]+/g;
// Locative/ablative only: "Kıbrıs'ta", "Berlin'den". Datives ("Jonas'a") are just as common for people.
const LOCATIVE = /^(da|de|ta|te|dan|den|tan|ten|daki|deki|taki|teki)$/i;

function isCapitalised(word: string): boolean {
  const first = word[0];
  if (!first || first !== first.toLocaleUpperCase('tr-TR') || first === first.toLocaleLowerCase('tr-TR')) return false;
  return word.length >= 2 && word !== word.toLocaleUpperCase('tr-TR'); // skip ALLCAPS shouting/acronyms
}

/** True for words that should never be remembered as a person (used to clean up older data too). */
export function isUnlikelyPerson(name: string): boolean {
  const words = fold(name).split(/\s+/).filter(Boolean);
  if (words.length === 0) return true;
  return words.some((w) => NOT_PEOPLE.has(w) || TITLE_WORDS.has(w) || FUNCTION_WORDS.has(w)) && !words.some((w) => FIRST_NAMES.has(w) && !AMBIGUOUS_NAMES.has(w));
}

export function extractEntities(text: string, known: Pick<Entity, 'key' | 'name' | 'kind'>[] = []): EntityMention[] {
  const found = new Map<string, EntityMention>();
  const add = (kind: EntityKind, name: string) => {
    const key = normalizeKey(name);
    if (key.length < 2 || found.has(key)) return;
    found.set(key, { kind, name, key });
  };
  const folded = fold(text).replace(/['’]/g, '');

  // 1. Already-known entities anywhere in the text (case-insensitive).
  const spaced = ` ${fold(text).replace(/['’]/g, ' ')} `;
  for (const k of known) {
    if (k.kind === 'person' && isUnlikelyPerson(k.name)) continue;
    if (spaced.includes(` ${k.key} `) || spaced.match(new RegExp(`[^a-z0-9]${k.key}[a-z]{0,6}[^a-z0-9]`))) add(k.kind, k.name);
  }

  // 2. Capitalised words, read as runs ("Ayşe Yılmaz", "İnsan Kaynakları Uzmanı").
  for (const sentence of text.split(/[.!?…\n:;"“”()]+/)) {
    const words = [...sentence.matchAll(WORD)].map((m) => m[0]);
    for (let i = 0; i < words.length; i++) {
      if (!isCapitalised(words[i])) continue;
      let j = i;
      while (j + 1 < words.length && isCapitalised(words[j + 1])) j++;
      const run = words.slice(i, j + 1);
      const next = words[j + 1] ? fold(stripSuffix(words[j + 1])) : '';
      i = j;
      handleRun(run, i - run.length + 1 === 0, next, add);
    }
  }

  // 3. Relations, with their modifiers ("en yakın arkadaşımla", "kız kardeşimleydim").
  const specific = new Set<string>();
  for (const rel of RELATIONS) {
    const re = new RegExp(`(?:^|[^a-z])((?:[a-z]+ ){0,2})${rel.stem}${REL_SUFFIX}(?=[^a-z]|$)`, 'g');
    let generic = false;
    for (const m of folded.matchAll(re)) {
      if (/kocaman/.test(m[0])) continue; // "kocaman" (huge) is not "kocam"
      const before = m[1].trim();
      const mod = rel.modifiers && Object.keys(rel.modifiers).sort((a, b) => b.length - a.length).find((k) => before === k || before.endsWith(` ${k}`));
      if (mod) {
        add('person', rel.modifiers![mod]);
        specific.add(rel.stem);
      } else if (rel.standalone) generic = true;
    }
    // "kardeşimleydim, kız kardeşimleydim": the bare mention is the same person as the specific one.
    if (generic && !specific.has(rel.stem)) add('person', rel.label);
  }

  return [...found.values()];
}

function handleRun(run: string[], sentenceStart: boolean, next: string, add: (kind: EntityKind, name: string) => void) {
  const bare = run.map(stripSuffix);
  const keys = bare.map((w) => fold(w));
  const lastRaw = run[run.length - 1];
  const suffix = lastRaw.includes("'") || lastRaw.includes('’') ? lastRaw.slice(lastRaw.search(/['’]/) + 1) : '';

  // Titles, departments, organisations, brands: skip the whole run.
  if (keys.some((k) => TITLE_WORDS.has(k))) {
    // …unless it starts with a real name: "Ayşe Hanım", "Mehmet Müdür".
    if (FIRST_NAMES.has(keys[0]) && !AMBIGUOUS_NAMES.has(keys[0]) && !sentenceStart) add('person', bare[0]);
    return;
  }

  // Leading function words at a sentence start ("Seni Tanıyorum", "Bugün Ayşe") are dropped.
  let start = 0;
  while (start < keys.length && (FUNCTION_WORDS.has(keys[start]) || NOT_PEOPLE.has(keys[start]))) start++;
  if (start >= keys.length) return;
  // A sentence-initial capital that is not a name is just grammar: "Toplantıda Ayşe Yılmaz…".
  if (sentenceStart && start === 0 && run.length > 1 && !FIRST_NAMES.has(keys[0]) && !PLACES.has(keys[0])) {
    return handleRun(run.slice(1), false, next, add);
  }
  const atStart = sentenceStart && start === 0;
  const k0 = keys[start];
  const w0 = bare[start];

  if (PLACES.has(k0) || (run.length - start === 1 && keys.length > 1 && PLACES.has(keys.slice(start).join('')))) return add('place', w0);

  const isName = FIRST_NAMES.has(k0);
  const ambiguous = AMBIGUOUS_NAMES.has(k0);
  const hasApostrophe = /['’]/.test(run[start]);
  const signalled = hasApostrophe || NAME_FOLLOWERS.has(next);

  if (isName) {
    if ((atStart || ambiguous) && !signalled && !(ambiguous && !atStart && run.length - start > 1)) return;
    // First name + surname stays together ("Ayşe Yılmaz").
    const k1 = keys[start + 1];
    const surname = k1 && !HONORIFICS.has(k1) && (!FIRST_NAMES.has(k1) || AMBIGUOUS_NAMES.has(k1)) && !PLACES.has(k1) ? ` ${bare[start + 1]}` : '';
    return add('person', w0 + surname);
  }

  // Not a known name. A single mid-sentence word with a place-like suffix is probably a place ("Kıbrıs'ta").
  if (run.length - start === 1 && !atStart && suffix && LOCATIVE.test(suffix)) return add('place', w0);
  // A single unknown capitalised word mid-sentence, clearly used as a person ("Jonas'la", "Jonas aradı").
  if (run.length - start === 1 && !atStart && signalled) return add('person', w0);
  // Anything else (multi-word titles, show names, unknown capitals) is not remembered.
}
