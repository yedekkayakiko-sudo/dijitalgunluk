import { emotionalTone, extractThemes } from './emotion';
import { fold, matchAny, phrase, stem, tokenize } from './text';

/*
 * Hybrid memory search: BM25 over stemmed tokens + (optional) embedding
 * cosine similarity + a soft time window parsed from the question
 * ("3 yıl önce", "geçen yaz", "2023'te").
 */

export interface SearchDoc {
  id: string;
  createdAt: string;
  text: string;
  mood?: number | null;
  embedding?: number[] | null;
}

// "üzgün olduğum günler", "mutlu olduğum anlar": questions about feelings, not words.
const LOW_MOOD = ['uzgun', 'kotu', 'zor', 'agladig', 'mutsuz', 'kederli', 'bunaldig', 'yorgun', 'moralim bozuk', 'dertli', 'yalniz hissettig'].map(phrase);
const HIGH_MOOD = ['mutlu', 'guzel', 'harika', 'sevincli', 'neseli', 'keyifli', 'gurur', 'eglenceli', 'huzurlu', 'heyecanli'].map(phrase);

export function queryMood(query: string): 'low' | 'high' | null {
  const q = fold(query);
  const low = matchAny(q, LOW_MOOD).length;
  const high = matchAny(q, HIGH_MOOD).length;
  return low > high ? 'low' : high > low ? 'high' : null;
}

export interface TimeWindow {
  from: Date;
  to: Date;
}

const DAY = 86_400_000;

const NUMBER_WORDS: Record<string, number> = {
  bir: 1, iki: 2, uc: 3, dort: 4, bes: 5, alti: 6, yedi: 7, sekiz: 8, dokuz: 9, on: 10,
};

const MONTHS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];

/** Season → [startMonth, endMonth] (0-based, inclusive; kış wraps the year). */
const SEASONS: Record<string, [number, number]> = {
  ilkbahar: [2, 4], bahar: [2, 4], yaz: [5, 7], sonbahar: [8, 10], kis: [11, 1],
};

function addMonths(d: Date, n: number): Date {
  const r = new Date(d);
  r.setMonth(r.getMonth() + n);
  return r;
}

export function parseTimeWindow(query: string, now: Date = new Date()): TimeWindow | null {
  const q = fold(query);

  const ago = q.match(/(\d+|bir|iki|uc|dort|bes|alti|yedi|sekiz|dokuz|on|birkac)\s+(yil|sene|ay|hafta|gun)\s+(once|evvel)/);
  if (ago) {
    const unit = ago[2];
    if (ago[1] === 'birkac') {
      const [lo, hi] = unit === 'gun' ? [2, 6] : [2, 5];
      const scale = unit === 'yil' || unit === 'sene' ? 365 : unit === 'ay' ? 30 : unit === 'hafta' ? 7 : 1;
      return { from: new Date(now.getTime() - hi * scale * DAY), to: new Date(now.getTime() - lo * scale * DAY + DAY) };
    }
    const n = /\d/.test(ago[1]) ? parseInt(ago[1], 10) : NUMBER_WORDS[ago[1]];
    const [days, slack] =
      unit === 'yil' || unit === 'sene' ? [n * 365, 240] : unit === 'ay' ? [n * 30, 21] : unit === 'hafta' ? [n * 7, 4] : [n, 1];
    const center = now.getTime() - days * DAY;
    return { from: new Date(center - slack * DAY), to: new Date(center + slack * DAY) };
  }

  const year = q.match(/\b(19|20)\d{2}\b/);
  const monthIdx = MONTHS.findIndex((m) => new RegExp(`(^|[^a-z])${m}`).test(q));
  if (monthIdx >= 0) {
    let y = year ? parseInt(year[0], 10) : now.getFullYear();
    if (!year && monthIdx > now.getMonth()) y -= 1;
    return { from: new Date(y, monthIdx, 1), to: new Date(y, monthIdx + 1, 1) };
  }
  if (year) {
    const y = parseInt(year[0], 10);
    return { from: new Date(y, 0, 1), to: new Date(y + 1, 0, 1) };
  }

  const season = q.match(/(gecen|bu)\s+(ilkbahar|sonbahar|bahar|yaz|kis)/);
  if (season) {
    const [start, end] = SEASONS[season[2]];
    // Most recent completed (gecen) or current (bu) season.
    let y = now.getFullYear();
    const startDate = () => new Date(y, start, 1);
    if (season[1] === 'gecen') {
      while (addMonths(startDate(), end >= start ? end - start + 1 : 12 - start + end + 1) > now) y -= 1;
    } else if (startDate() > now) {
      y -= 1;
    }
    const s = startDate();
    return { from: s, to: addMonths(s, end >= start ? end - start + 1 : 12 - start + end + 1) };
  }

  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (/(^|\s)dun(\s|$)/.test(q)) return { from: new Date(startOfDay.getTime() - DAY), to: startOfDay };
  if (/gecen\s+hafta/.test(q)) return { from: new Date(startOfDay.getTime() - 14 * DAY), to: new Date(startOfDay.getTime() - 6 * DAY) };
  if (/gecen\s+ay/.test(q)) return { from: new Date(now.getFullYear(), now.getMonth() - 1, 1), to: new Date(now.getFullYear(), now.getMonth(), 1) };
  if (/gecen\s+(yil|sene)/.test(q)) return { from: new Date(now.getFullYear() - 1, 0, 1), to: new Date(now.getFullYear(), 0, 1) };
  if (/bu\s+(yil|sene)/.test(q)) return { from: new Date(now.getFullYear(), 0, 1), to: new Date(now.getFullYear() + 1, 0, 1) };
  if (/bu\s+ay/.test(q)) return { from: new Date(now.getFullYear(), now.getMonth(), 1), to: new Date(now.getFullYear(), now.getMonth() + 1, 1) };
  return null;
}

/** Question words and time words that carry no topical meaning (folded). */
const STOP = new Set([
  'ben', 'bana', 'beni', 'benim', 'sen', 'o', 'bir', 've', 'ile', 'de', 'da', 'mi', 'mu', 'ki', 'bu', 'su', 'icin', 'gibi',
  'kim', 'kimdi', 'kimle', 'ne', 'neydi', 'nerede', 'neredeydi', 'zaman', 'nasil', 'nasildi', 'hangi', 'kac', 'neden',
  'yil', 'sene', 'ay', 'hafta', 'gun', 'once', 'evvel', 'gecen', 'dun', 'bugun', 'hatirliyor', 'hatirla', 'hatirlat',
  'yazmistim', 'yazdim', 'yazdigim', 'miydi', 'muydu', 'mıydı', 'cok', 'daha', 'en', 'olan', 'oldu', 'var', 'yok',
  'birkac', 'iki', 'uc', 'dort', 'bes', ...MONTHS,
]);

export function queryTerms(query: string): string[] {
  return tokenize(query)
    .filter((t) => !STOP.has(t) && !/^\d+$/.test(t) && t.length > 1)
    .map(stem);
}

export function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0;
  for (let i = 0; i < Math.min(a.length, b.length); i++) {
    dot += a[i] * b[i];
    na += a[i] * a[i];
    nb += b[i] * b[i];
  }
  return na && nb ? dot / Math.sqrt(na * nb) : 0;
}

export interface SearchOptions {
  now?: Date;
  queryEmbedding?: number[] | null;
  limit?: number;
}

export interface SearchHit {
  id: string;
  score: number;
  inWindow: boolean;
}

export function searchEntries(query: string, docs: SearchDoc[], opts: SearchOptions = {}): SearchHit[] {
  const limit = opts.limit ?? 5;
  const terms = [...new Set(queryTerms(query))];
  const window = parseTimeWindow(query, opts.now);
  const mood = queryMood(query);
  const themes = extractThemes(query);

  // BM25
  const k1 = 1.2, b = 0.75;
  const docTokens = docs.map((d) => tokenize(d.text).map(stem));
  const avgLen = docTokens.reduce((s, t) => s + t.length, 0) / Math.max(1, docTokens.length);
  const df = new Map<string, number>();
  for (const toks of docTokens) for (const t of new Set(toks)) if (terms.includes(t)) df.set(t, (df.get(t) ?? 0) + 1);

  const lexical = docTokens.map((toks) => {
    let s = 0;
    for (const term of terms) {
      const tf = toks.filter((t) => t === term).length;
      if (!tf) continue;
      const n = df.get(term) ?? 0;
      const idf = Math.log(1 + (docs.length - n + 0.5) / (n + 0.5));
      s += idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + (b * toks.length) / avgLen)));
    }
    return s;
  });
  const maxLex = Math.max(0, ...lexical);

  const hits = docs.map((d, i) => {
    const lex = maxLex > 0 ? lexical[i] / maxLex : 0;
    const vec = opts.queryEmbedding && d.embedding ? Math.max(0, cosine(opts.queryEmbedding, d.embedding)) : null;
    let score = vec === null ? lex : 0.45 * lex + 0.55 * vec;
    if (mood) {
      const tone = emotionalTone(d.text);
      const fits = mood === 'low' ? (d.mood != null && d.mood <= 2) || tone.negative >= 0.25 : (d.mood != null && d.mood >= 4) || tone.positive >= 0.25;
      if (fits) score += 0.4;
    }
    if (themes.length && extractThemes(d.text).some((t) => themes.includes(t))) score += 0.3;
    const t = new Date(d.createdAt).getTime();
    const inWindow = !!window && t >= window.from.getTime() && t < window.to.getTime();
    if (window) score = inWindow ? score * 1.5 + (terms.length === 0 ? 0.5 : 0) : score * 0.3;
    return { id: d.id, score, inWindow };
  });

  return hits
    .filter((h) => h.score > 0.05)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
