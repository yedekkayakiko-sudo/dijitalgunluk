const FOLD: Record<string, string> = {
  ç: 'c', ğ: 'g', ı: 'i', i: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u',
};

/** Lowercases with Turkish rules (İ→i, I→ı) and folds diacritics so "Ayşe" and "ayse" match. */
export function fold(text: string): string {
  return text
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (c) => FOLD[c] ?? c);
}

export function lower(text: string): string {
  return text.toLocaleLowerCase('tr-TR');
}

/** Apostrophes used before Turkish case suffixes: Ayşe'yle, Ankara’da */
const APOSTROPHES = /['’`´]/;

export function stripSuffix(word: string): string {
  const i = word.search(APOSTROPHES);
  return i > 0 ? word.slice(0, i) : word;
}

export function tokenize(text: string): string[] {
  return fold(text)
    .split(/[^a-z0-9'’]+/)
    .map((w) => stripSuffix(w))
    .filter((w) => w.length > 0);
}

export function wordCount(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}

/**
 * Turkish is agglutinative; a fixed-length prefix is a surprisingly good
 * poor-man's stemmer ("tanıştım", "tanıştığım" → "tanis").
 */
export function stem(token: string): string {
  return token.length > 5 ? token.slice(0, 5) : token;
}

export function stems(text: string): string[] {
  return tokenize(text).map(stem);
}

/** Tests a folded text against folded patterns. Patterns match at word starts, so suffixes are tolerated. */
export function matchAny(foldedText: string, patterns: readonly RegExp[]): string[] {
  const hits: string[] = [];
  for (const p of patterns) {
    const m = foldedText.match(p);
    if (m) hits.push(m[0]);
  }
  return hits;
}

/** Builds a word-start regex from a folded phrase; spaces allow any whitespace. */
export function phrase(p: string): RegExp {
  return new RegExp(`(^|[^a-z0-9çğıöşüâîû])${p.replace(/ /g, '\\s+')}`, 'i');
}
