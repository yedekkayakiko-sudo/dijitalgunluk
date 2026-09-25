import { emotionalTone, extractThemes, THEMES } from './emotion';
import { extractEntities, type EntityMention } from './entities';
import { detectCrisis, type CrisisLevel } from './safety';
import { wordCount } from './text';
import type { Entity, Entry, MascotTone, ReactionKind, ReactionRecord } from './types';

/*
 * Decides whether the mascot says anything after an entry is saved.
 *
 *  - Hard moments come first. Crisis language or a clearly heavy day always
 *    gets a warm, friend-like reply: presence first, never a lecture. Explicit
 *    crisis language additionally shows a small, quiet support row in the app.
 *  - Otherwise silence is the default; nudges are probabilistic and rate-limited.
 *  - Entries marked "private" or "AI can read but not analyse" are never sent
 *    to the AI; for them the mascot only uses on-device words.
 */

export const SHORT_ENTRY_WORDS = 15;
const HOUR = 3_600_000;
const DAY = 24 * HOUR;

/** Themes that deserve a gentle check-in when they keep coming back. */
const SENSITIVE_THEMES = new Set(['endise', 'yorgunluk', 'yalnizlik']);

const TONE_FACTOR: Record<MascotTone, number> = { calm: 1, energetic: 1.15, minimal: 0.4, frank: 1 };
/** Minimum quiet time between two light (non-support) reactions. */
const COOLDOWN: Record<MascotTone, number> = { calm: 20 * HOUR, energetic: 12 * HOUR, minimal: 72 * HOUR, frank: 20 * HOUR };
const SUPPORT_COOLDOWN = 8 * HOUR;

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
  /** Whether the entry's privacy level lets the AI write the reply. */
  aiAllowed: boolean;
  /** Entities mentioned in the entry; empty when the privacy level forbids analysis. */
  mentions: EntityMention[];
  themes: string[];
}

type Templated = 'short_streak' | 'new_person' | 'recurring_theme' | 'support' | 'celebrate' | 'welcome';

const TEMPLATES: Record<Templated, Record<MascotTone, string[]>> = {
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
    frank: ['Son sayfalar hep kısa. Yazacak bir şey mi yok, yoksa yazmak istemediğin bir şey mi var?'],
  },
  new_person: {
    calm: ['{s} adını ilk kez duyuyorum. Onunla nasıl tanıştınız?', '{s} kim? Merak ettim, anlatmak istersen dinlerim.'],
    energetic: ['Yeni bir isim: {s}! İlk kez mi tanıştınız?', '{s} de kim? Hikâyesini merak ettim!'],
    minimal: ['{s}: yeni bir isim. Not ettim.'],
    frank: ['{s} kim? Hayatında yeni biri mi, yoksa hep vardı da ben mi yeni duyuyorum?'],
  },
  recurring_theme: {
    calm: [
      'Son birkaç sayfanda {s} konusu sık geçiyor. Bununla ilgili biraz daha yazmak ister misin?',
      'Fark ettim ki {s} son günlerde sık sık aklında. Konuşmak ister misin?',
    ],
    energetic: ['Son günlerde {s} konusu sık sık karşıma çıkıyor. Biraz açmak ister misin?'],
    minimal: ['{s} son günlerde sık geçiyor. İstersen buradayım.'],
    frank: ['Açık söyleyeyim: {s} son sayfalarında hep var. Bunun üzerine bir kez adamakıllı konuşalım mı?'],
  },
  support: {
    calm: [
      'Bugün seni çok yormuş gibi. Buradayım; anlatmak istersen acele etmeden dinlerim.',
      'Ağır bir gün olmuş. Bunu yazıya dökmen bile kolay değil, iyi ki yazdın. İstersen biraz konuşalım.',
    ],
    energetic: [
      'Of, zor bir gün olmuş. Yanındayım! Anlatmak istersen buradayım, istemezsen de sadece yanında dururum.',
      'Bugün kolay değilmiş. İyi ki yazdın. Konuşmak istersen hemen buradayım.',
    ],
    minimal: ['Zor bir gün. Buradayım.'],
    frank: ['Ağır bir gün olmuş, bunu görüyorum. Seni asıl yoran ne, olan şey mi, yoksa ondan sonra kendine söylediklerin mi?'],
  },
  welcome: {
    calm: ['İlk sayfan! Bunu, birlikte biriktireceğimiz her şeyin başlangıcı olarak saklıyorum. Hoş geldin. 🌱'],
    energetic: ['İlk sayfaaa! 🎉 Bu anı hiç unutmayacağım. Hadi birlikte büyüyelim!'],
    minimal: ['İlk sayfa. Saklandı. 🌱'],
    frank: ['İlk sayfan. Bundan sonra seni sayfalarından tanıyacağım; ben de sana dürüst olacağım, söz.'],
  },
  celebrate: {
    calm: ['Bu sayfadan mutluluk taşıyor. Bu anı sakladığın için sevindim.', 'Ne güzel bir gün! Bunu ileride okuduğunda da gülümseyeceksin.'],
    energetic: ['Yaşasın! Bu sayfa pırıl pırıl. Bu anı çerçeveletelim!', 'Bu enerjiye bayıldım! Bugün seni en çok ne güldürdü?'],
    minimal: ['Güzel bir gün. Kaydettim.'],
    frank: ['Bak, bu sayfa ışıl ışıl. Zor günlerde buna geri döneceğiz, haberin olsun.'],
  },
};

/** On-device fallback for crisis moments. Presence first, then one clear safety line. */
export const CRISIS_TEXT: Record<Exclude<CrisisLevel, 'none'>, string> = {
  acute:
    'Bunu yazacak kadar ağır bir yerdesin ve bunu benimle paylaştığın için iyi ki yazdın. Yalnız değilsin, buradayım ve seni dinliyorum. ' +
    'Şu an kendini güvende hissetmiyorsan lütfen hemen 112\'yi ara ya da yanında olabilecek birine haber ver. Sonra istersen birlikte konuşalım.',
  concern:
    'Çok yorucu bir yerden yazıyorsun gibi. Bu kadar yükü taşımak kolay değil. Anlatmak istersen buradayım, acele yok.',
};

function pick<T>(items: T[], random: () => number): T {
  return items[Math.floor(random() * items.length) % items.length];
}

function isShort(e: Pick<Entry, 'text' | 'kind'>): boolean {
  return e.kind === 'one_word' || wordCount(e.text) < SHORT_ENTRY_WORDS;
}

function reactedRecently(past: ReactionRecord[], now: number, windowMs: number, kinds?: ReactionKind[], subject?: string): boolean {
  return past.some(
    (r) =>
      r.kind !== 'none' &&
      now - new Date(r.at).getTime() < windowMs &&
      (kinds === undefined ? r.kind !== 'crisis' && r.kind !== 'support' : kinds.includes(r.kind)) &&
      (subject === undefined || r.subject === subject),
  );
}

export function decideReaction(input: ReactionInput): ReactionDecision {
  const random = input.random ?? Math.random;
  const now = (input.now ?? new Date()).getTime();
  const { entry, tone } = input;
  const analysable = entry.privacy === 'ai_full';

  const reply = (kind: ReactionKind, text: string | null, extra: Partial<ReactionDecision> = {}): ReactionDecision => ({
    kind, crisisLevel: 'none', subject: null, text, aiAllowed: analysable && kind !== 'none', mentions: [], themes: [], ...extra,
  });

  // 1. Crisis language: always answered, whatever the privacy level (on-device words when the AI may not read it).
  const crisis = detectCrisis(entry.text);
  if (crisis.level !== 'none') {
    return reply(crisis.level === 'acute' ? 'crisis' : 'support', CRISIS_TEXT[crisis.level], { crisisLevel: crisis.level });
  }

  // 2. The very first page always gets a warm welcome: the first "it knows me" moment.
  const firstPage = input.recent.length === 0 && input.pastReactions.length === 0;
  if (firstPage) {
    const welcome = pick(TEMPLATES.welcome[tone], random);
    return reply('welcome', welcome, analysable ? { mentions: extractEntities(entry.text, input.knownEntities), themes: extractThemes(entry.text) } : {});
  }

  // 3. Privacy: only "full analysis" entries are analysed any further.
  if (!analysable) return reply('none', null);

  const mentions = extractEntities(entry.text, input.knownEntities);
  const themes = extractThemes(entry.text);
  const base = { mentions, themes };
  const factor = TONE_FACTOR[tone];
  const roll = (p: number) => random() < Math.min(0.95, p * factor);
  const templated = (kind: Templated, subject: string | null = null): ReactionDecision =>
    reply(kind, pick(TEMPLATES[kind][tone], random).replace('{s}', subject ?? ''), { ...base, subject });

  // 4. A clearly hard day: a friend notices, even if we talked recently.
  const feel = emotionalTone(entry.text);
  if (feel.negative >= 0.45 && !reactedRecently(input.pastReactions, now, SUPPORT_COOLDOWN, ['support', 'crisis']) && roll(0.75)) {
    return templated('support');
  }

  // 5. Light reactions are rate-limited so the mascot never feels chatty.
  if (reactedRecently(input.pastReactions, now, COOLDOWN[tone])) return reply('none', null, base);

  const windowed = input.recent.filter((e) => now - new Date(e.createdAt).getTime() < 10 * DAY);

  // 4a. A theme keeps returning, with emotional weight.
  const analysed = windowed.filter((e) => e.privacy === 'ai_full');
  for (const theme of themes) {
    const count = 1 + analysed.filter((e) => extractThemes(e.text).includes(theme)).length;
    const weighty = feel.intensity >= 0.3 || SENSITIVE_THEMES.has(theme);
    const label = THEMES[theme].label;
    if (count >= 3 && weighty && !reactedRecently(input.pastReactions, now, 7 * DAY, ['recurring_theme'], label) && roll(0.5)) {
      return templated('recurring_theme', label);
    }
  }

  // 4b. Someone new.
  const knownKeys = new Set(input.knownEntities.map((k) => k.key));
  const newPeople = mentions.filter((m) => m.kind === 'person' && !knownKeys.has(m.key));
  if (newPeople.length > 0 && roll(0.55)) return templated('new_person', newPeople[0].name);

  // 4c. A joyful day, sometimes celebrated.
  if (feel.positive >= 0.45 && feel.negative === 0 && roll(0.35)) return templated('celebrate');

  // 4d. Three or more short entries in a row, at most once a week.
  const lastTwo = windowed.slice(0, 2);
  if (
    isShort(entry) &&
    lastTwo.length === 2 &&
    lastTwo.every(isShort) &&
    !reactedRecently(input.pastReactions, now, 7 * DAY, ['short_streak']) &&
    roll(0.7)
  ) {
    return templated('short_streak');
  }

  return reply('none', null, base);
}
