import { emotionalIntensity, extractThemes, THEMES } from './emotion';
import { extractEntities, type EntityMention } from './entities';
import { detectCrisis, type CrisisLevel } from './safety';
import { wordCount } from './text';
import type { Entity, Entry, MascotTone, ReactionKind, ReactionRecord } from './types';

/*
 * Decides whether the mascot says anything after an entry is saved.
 *
 * Principles (from the product spec):
 *  - Silence is the default. Most entries get no reaction at all.
 *  - Nudges are probabilistic and rate-limited so they never feel like pressure.
 *  - Crisis signals always get a calm, fixed response with resources; they are
 *    never softened and never routed through the AI.
 *  - Entries marked "private" or "AI can read but not analyse" are not analysed.
 */

export const SHORT_ENTRY_WORDS = 15;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Themes that deserve a gentle check-in when they keep coming back. */
const SENSITIVE_THEMES = new Set(['endise', 'yorgunluk', 'yalnizlik']);

const TONE_FACTOR: Record<MascotTone, number> = { calm: 1, energetic: 1.15, minimal: 0.4 };
/** Minimum quiet time between two non-crisis reactions. */
const COOLDOWN: Record<MascotTone, number> = { calm: 20 * HOUR, energetic: 12 * HOUR, minimal: 72 * HOUR };

export interface ReactionInput {
  entry: Pick<Entry, 'text' | 'createdAt' | 'privacy' | 'kind'>;
  /** Earlier entries, newest first, not including `entry`. */
  recent: Pick<Entry, 'text' | 'createdAt' | 'privacy' | 'kind'>[];
  knownEntities: Pick<Entity, 'key' | 'name' | 'kind'>[];
  /** Earlier mascot reactions, newest first. */
  pastReactions: ReactionRecord[];
  tone: MascotTone;
  now?: Date;
  random?: () => number;
}

export interface ReactionDecision {
  kind: ReactionKind;
  crisisLevel: CrisisLevel;
  /** Person name or theme label the reaction is about. */
  subject: string | null;
  /** Safe, pre-written text. Shown as-is, or used when the AI is unavailable or its output is rejected. */
  text: string | null;
  /** Whether the AI may rephrase `text` for this entry (full-analysis privacy only, never for crisis). */
  aiAllowed: boolean;
  /** Entities mentioned in the entry; empty when the privacy level forbids analysis. */
  mentions: EntityMention[];
  themes: string[];
}

const TEMPLATES: Record<'short_streak' | 'new_person' | 'recurring_theme', Record<MascotTone, string[]>> = {
  short_streak: {
    calm: [
      'Son birkaç sayfan kısa kısa. Bazen günler böyle geçer, sorun değil. Anlatmak istediğin bir şey olursa buradayım.',
      'Bugün biraz hızlı geçmiş gibi. Kısa tutmanın bir sebebi var mıydı, yoksa sadece yorucu bir gün müydü?',
    ],
    energetic: [
      'Son sayfalar kısacık! Bugünden aklında kalan tek bir an olsa, o ne olurdu?',
      'Bugün hızlı geçmiş gibi! Bir şey mi vardı ki bu kadar kısa tuttun?',
    ],
    minimal: ['Kısa ve öz. Eklemek istersen buradayım.'],
  },
  new_person: {
    calm: ['{s} adını ilk kez duyuyorum. Onunla nasıl tanıştınız?', '{s} kim? Merak ettim, anlatmak istersen dinlerim.'],
    energetic: ['Yeni bir isim: {s}! İlk kez mi tanıştınız?', '{s} de kim? Hikâyesini merak ettim!'],
    minimal: ['{s}: yeni bir isim. Not ettim.'],
  },
  recurring_theme: {
    calm: [
      'Son birkaç sayfanda {s} konusu sık geçiyor. Bununla ilgili biraz daha yazmak ister misin?',
      'Fark ettim ki {s} son günlerde sık sık aklında. Konuşmak ister misin?',
    ],
    energetic: ['Son günlerde {s} konusu sık sık karşıma çıkıyor. Biraz açmak ister misin?'],
    minimal: ['{s} son günlerde sık geçiyor. İstersen buradayım.'],
  },
};

export const CRISIS_TEXT: Record<Exclude<CrisisLevel, 'none'>, string> = {
  acute:
    'Yazdıklarını okudum ve şu an çok ağır bir yerde olabileceğini düşünüyorum. Bu yükü tek başına taşımak zorunda değilsin. ' +
    'Kendini güvende hissetmiyorsan lütfen hemen 112\'yi ara ya da yanında olabilecek birine ulaş. Aşağıda destek alabileceğin yerler var.',
  concern:
    'Yazdıkların çok yorucu bir dönemden geçtiğini gösteriyor. Bunu güvendiğin biriyle ya da bir uzmanla paylaşmak iyi gelebilir. ' +
    'Aşağıda ulaşabileceğin kaynaklar var. Ben de buradayım.',
};

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function isShort(e: Pick<Entry, 'text' | 'kind'>): boolean {
  return e.kind === 'one_word' || wordCount(e.text) < SHORT_ENTRY_WORDS;
}

function reactedRecently(past: ReactionRecord[], now: number, windowMs: number, kind?: ReactionKind, subject?: string): boolean {
  return past.some(
    (r) =>
      r.kind !== 'crisis' &&
      r.kind !== 'none' &&
      now - new Date(r.at).getTime() < windowMs &&
      (kind === undefined || r.kind === kind) &&
      (subject === undefined || r.subject === subject),
  );
}

export function decideReaction(input: ReactionInput): ReactionDecision {
  const random = input.random ?? Math.random;
  const now = (input.now ?? new Date()).getTime();
  const { entry, tone } = input;

  const silent = (mentions: EntityMention[] = [], themes: string[] = []): ReactionDecision => ({
    kind: 'none', crisisLevel: 'none', subject: null, text: null, aiAllowed: false, mentions, themes,
  });

  // 1. Crisis check runs locally for every entry, whatever its privacy level.
  const crisis = detectCrisis(entry.text);
  if (crisis.level !== 'none') {
    return {
      kind: 'crisis', crisisLevel: crisis.level, subject: null, text: CRISIS_TEXT[crisis.level],
      aiAllowed: false, mentions: [], themes: [],
    };
  }

  // 2. Privacy: only "full analysis" entries are analysed.
  if (entry.privacy !== 'ai_full') return silent();

  const mentions = extractEntities(entry.text, input.knownEntities);
  const themes = extractThemes(entry.text);
  const knownKeys = new Set(input.knownEntities.map((k) => k.key));
  const newPeople = mentions.filter((m) => m.kind === 'person' && !knownKeys.has(m.key));

  // 3. Rate limit: never chatty.
  if (reactedRecently(input.pastReactions, now, COOLDOWN[tone])) return silent(mentions, themes);

  const factor = TONE_FACTOR[tone];
  const roll = (p: number) => random() < Math.min(0.95, p * factor);
  const windowed = input.recent.filter((e) => now - new Date(e.createdAt).getTime() < 10 * DAY);
  const result = (kind: keyof typeof TEMPLATES, subject: string | null): ReactionDecision => ({
    kind, crisisLevel: 'none', subject,
    text: pick(TEMPLATES[kind][tone], random).replace('{s}', subject ?? ''),
    aiAllowed: true, mentions, themes,
  });

  // 4a. A theme keeps returning, with emotional weight.
  const intensity = emotionalIntensity(entry.text);
  const analysable = windowed.filter((e) => e.privacy === 'ai_full');
  for (const theme of themes) {
    const count = 1 + analysable.filter((e) => extractThemes(e.text).includes(theme)).length;
    const weighty = intensity >= 0.3 || SENSITIVE_THEMES.has(theme);
    const label = THEMES[theme].label;
    if (count >= 3 && weighty && !reactedRecently(input.pastReactions, now, 7 * DAY, 'recurring_theme', label) && roll(0.5)) {
      return result('recurring_theme', label);
    }
  }

  // 4b. Someone new.
  if (newPeople.length > 0 && roll(0.55)) return result('new_person', newPeople[0].name);

  // 4c. Three or more short entries in a row, at most once a week.
  const lastTwo = windowed.slice(0, 2);
  if (
    isShort(entry) &&
    lastTwo.length === 2 &&
    lastTwo.every(isShort) &&
    !reactedRecently(input.pastReactions, now, 7 * DAY, 'short_streak') &&
    roll(0.7)
  ) {
    return result('short_streak', null);
  }

  return silent(mentions, themes);
}
