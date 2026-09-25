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

// Capitalised words that are not names (folded).
const NOT_NAMES = new Set(
  [
    'ben', 'sen', 'o', 'biz', 'siz', 'onlar', 'bugun', 'dun', 'yarin', 'sonra', 'once', 'ama', 'fakat',
    've', 'ile', 'cunku', 'bir', 'bu', 'su', 'her', 'hic', 'cok', 'az', 'belki', 'sanirim', 'aslinda',
    'sabah', 'ogle', 'aksam', 'gece', 'simdi', 'yine', 'hala', 'neyse', 'ayrica', 'bence', 'galiba',
    'tamam', 'evet', 'hayir', 'merhaba', 'sevgili', 'gunluk', 'allah', 'insallah', 'masallah',
    'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar',
    'ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik',
    'turkiye', 'turkce', 'ingilizce', 'instagram', 'whatsapp', 'twitter', 'youtube', 'netflix', 'spotify', 'google',
    'iphone', 'android', 'tiktok', 'ramazan', 'bayram', 'kurban', 'yilbasi', 'hoca', 'doktor', 'abi', 'abla',
    'kahve', 'cay', 'film', 'dizi', 'okul', 'is', 'ev', 'nasil', 'neden', 'ne', 'kim', 'kimse', 'herkes',
  ],
);

// A few common places so they are not mistaken for people.
const PLACES = new Set(
  [
    'istanbul', 'ankara', 'izmir', 'bursa', 'antalya', 'adana', 'konya', 'gaziantep', 'eskisehir', 'trabzon',
    'kayseri', 'mersin', 'samsun', 'diyarbakir', 'erzurum', 'bodrum', 'kapadokya', 'kadikoy', 'besiktas',
    'uskudar', 'taksim', 'moda', 'cihangir', 'karakoy', 'alsancak', 'kizilay', 'paris', 'londra', 'berlin',
    'roma', 'amsterdam', 'new york', 'tokyo', 'barcelona', 'viyana', 'prag',
  ],
);

// Family words: the diary author's relatives are people worth remembering too.
const RELATIONS: Record<string, string> = {
  annem: 'Annem', babam: 'Babam', ablam: 'Ablam', abim: 'Abim', kardesim: 'Kardeşim',
  anneannem: 'Anneannem', babaannem: 'Babaannem', dedem: 'Dedem', teyzem: 'Teyzem',
  halam: 'Halam', dayim: 'Dayım', amcam: 'Amcam', esim: 'Eşim', sevgilim: 'Sevgilim',
};

// Words that, following a capitalised sentence-initial word, strongly suggest it is a name.
const NAME_FOLLOWERS = new Set(['ile', 've', 'bana', 'beni', 'benimle', 'bugun', 'dun', 'aradi', 'geldi', 'dedi', 'yazdi']);

const WORD = /[A-Za-zÇĞİÖŞÜçğıöşüÂÎÛâîû'’]+/g;

export function extractEntities(text: string, known: Pick<Entity, 'key' | 'name' | 'kind'>[] = []): EntityMention[] {
  const found = new Map<string, EntityMention>();
  const add = (kind: EntityKind, name: string) => {
    const key = normalizeKey(name);
    if (key.length < 2 || found.has(key)) return;
    found.set(key, { kind, name, key });
  };

  // 1. Already-known entities anywhere in the text (case-insensitive).
  const foldedText = ` ${fold(text).replace(/['’]/g, ' ')} `;
  for (const k of known) {
    if (foldedText.includes(` ${k.key} `) || foldedText.match(new RegExp(`[^a-z0-9]${k.key}[a-z]{0,6}[^a-z0-9]`))) {
      add(k.kind, k.name);
    }
  }

  // 2. Capitalised words, handling sentence starts conservatively.
  for (const sentence of text.split(/[.!?…\n]+/)) {
    const words = [...sentence.matchAll(WORD)].map((m) => m[0]);
    words.forEach((raw, i) => {
      const hasApostrophe = /['’]/.test(raw);
      const word = stripSuffix(raw);
      const first = word[0];
      if (!first || first !== first.toLocaleUpperCase('tr-TR') || first === first.toLocaleLowerCase('tr-TR')) return;
      if (word.length < 2 || word === word.toLocaleUpperCase('tr-TR')) return; // skip ALLCAPS shouting/acronyms
      const key = fold(word);
      if (NOT_NAMES.has(key)) return;
      if (PLACES.has(key)) return add('place', word);
      if (i === 0) {
        const next = words[i + 1] ? fold(stripSuffix(words[i + 1])) : '';
        const confident = hasApostrophe || NAME_FOLLOWERS.has(next);
        if (!confident) return;
      }
      add('person', word);
    });
  }

  // 3. Relations ("annemle", "babamın").
  for (const token of fold(text).split(/[^a-z']+/)) {
    for (const [rel, label] of Object.entries(RELATIONS)) {
      if (token === rel || (token.startsWith(rel) && token.length - rel.length <= 4)) add('person', label);
    }
  }

  return [...found.values()];
}
