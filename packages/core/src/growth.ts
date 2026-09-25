import type { Entry } from './types';

/*
 * Bağ (bond): how well the mascot knows the user. It grows from meaningful
 * moments (writing, naming a feeling, returning to a memory, keeping a goal)
 * rather than from tapping a button, and it never shrinks. Early levels come
 * quickly; reaching "can dostu" takes most of a year of real writing.
 *
 * The mascot's look follows the bond through ten forms, and its little props
 * follow what the user writes about (see traits.ts): it grows with them.
 */

export type BondEvent =
  | 'entry'        // a new page
  | 'deep_entry'   // a page of 80+ words
  | 'feeling'      // the page names a mood
  | 'photo'
  | 'one_word'
  | 'chat'         // a message to the mascot
  | 'memory'       // reopening an old page ("bu tarihte", "hatırlıyor musun?")
  | 'goal_set'
  | 'goal_checkin'
  | 'goal_review'
  | 'letter'
  | 'breathe'
  | 'goodnight'    // tucking the mascot in at night
  | 'return'       // coming back after a few quiet days: missed, never punished
  | 'first_page';  // the very first page: the sprout appears right away

export const BOND_POINTS: Record<BondEvent, number> = {
  entry: 12, deep_entry: 6, feeling: 2, photo: 2, one_word: 5, chat: 2, memory: 3,
  goal_set: 5, goal_checkin: 4, goal_review: 10, letter: 8, breathe: 3, goodnight: 2, return: 6, first_page: 15,
};

/** Per-event daily caps, so the bond reflects real days, not grinding. */
const EVENT_CAP: Partial<Record<BondEvent, number>> = { chat: 10, memory: 6, breathe: 6, goodnight: 2, entry: 24, deep_entry: 12, one_word: 5, photo: 4, feeling: 4 };
export const DAILY_CAP = 70;
export const MAX_LEVEL = 30;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(25 * Math.pow(level - 1, 1.55));
}

export function levelFor(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xp >= xpForLevel(level + 1)) level++;
  return level;
}

export interface Chapter {
  name: string;
  from: number;
}

export const CHAPTERS: Chapter[] = [
  { name: 'Yeni tanışıyoruz', from: 1 },
  { name: 'Arkadaş', from: 5 },
  { name: 'Yakın dost', from: 10 },
  { name: 'Sırdaş', from: 16 },
  { name: 'Can dostu', from: 23 },
];

export function chapterFor(level: number): Chapter {
  return [...CHAPTERS].reverse().find((c) => level >= c.from)!;
}

/** Ten looks. Each keeps everything from the previous one and adds something. */
export interface Form {
  id: number;
  level: number;
  name: string;
  /** What changed, said by the mascot when it happens. */
  line: string;
}

export const FORMS: Form[] = [
  { id: 0, level: 1, name: 'Minik', line: 'Merhaba! Daha minicik bir yavruyum. Seni tanıdıkça büyüyeceğim.' },
  { id: 1, level: 2, name: 'Filizli', line: 'Başımda ilk filiz çıktı! Demek ki birbirimize alışıyoruz.' },
  { id: 2, level: 4, name: 'Kulaklı', line: 'Kulaklarım çıktı! Artık seni daha iyi duyacağım.' },
  { id: 3, level: 6, name: 'Yapraklı', line: 'Filizim iki yaprak açtı. Sayfaların bana iyi geliyor.' },
  { id: 4, level: 9, name: 'Kuyruklu', line: 'Bak, bir kuyruğum oldu! Sevinince sallayacağım.' },
  { id: 5, level: 12, name: 'Tomurcuklu', line: 'Başımda bir tomurcuk var. İçinde ne saklı, birlikte göreceğiz.' },
  { id: 6, level: 15, name: 'Çiçekli', line: 'Çiçek açtım! Bu, birlikte biriktirdiğimiz her şeyin rengi.' },
  { id: 7, level: 19, name: 'Benekli', line: 'Tüylerimde minik benekler çıktı. Her biri bir anımız.' },
  { id: 8, level: 24, name: 'Taçlı', line: 'Başımda çiçekten bir taç var. Artık gerçekten can dostuz.' },
  { id: 9, level: 30, name: 'Işıltılı', line: 'Etrafımda minik ışıklar dolaşıyor. Sayfaların bende yıldız oldu.' },
];

export function formFor(level: number): Form {
  return [...FORMS].reverse().find((f) => level >= f.level)!;
}

/** Things the user can put on the mascot, unlocked by the bond. */
export interface Accessory {
  id: 'none' | 'scarf' | 'glasses' | 'beanie' | 'bow' | 'headphones' | 'flowerpin' | 'backpack' | 'crown';
  name: string;
  level: number;
}

export const ACCESSORIES: Accessory[] = [
  { id: 'none', name: 'Sade', level: 1 },
  { id: 'scarf', name: 'Atkı', level: 3 },
  { id: 'bow', name: 'Fiyonk', level: 5 },
  { id: 'glasses', name: 'Yuvarlak gözlük', level: 7 },
  { id: 'beanie', name: 'Bere', level: 10 },
  { id: 'headphones', name: 'Kulaklık', level: 13 },
  { id: 'flowerpin', name: 'Çiçek toka', level: 17 },
  { id: 'backpack', name: 'Sırt çantası', level: 21 },
  { id: 'crown', name: 'Minik taç', level: 27 },
];

export interface BondState {
  xp: number;
  /** ISO date of the very first page: the mascot's birthday. */
  bornAt: string | null;
  /** Local day (YYYY-MM-DD) the daily counters belong to. */
  day: string;
  today: number;
  todayByEvent: Partial<Record<BondEvent, number>>;
  /** Highest level the user has seen celebrated. */
  seenLevel: number;
  accessory: Accessory['id'];
}

export const INITIAL_BOND: BondState = { xp: 0, bornAt: null, day: '', today: 0, todayByEvent: {}, seenLevel: 1, accessory: 'none' };

export function localDay(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface Award {
  state: BondState;
  gained: number;
  /** Set when the award crossed into a new level. */
  levelUp: number | null;
  /** Set when the new level also brought a new form. */
  newForm: Form | null;
  unlocked: Accessory[];
}

export function award(state: BondState, events: BondEvent[], at: Date = new Date()): Award {
  const day = localDay(at);
  let s: BondState = state.day === day ? { ...state, todayByEvent: { ...state.todayByEvent } } : { ...state, day, today: 0, todayByEvent: {} };
  let gained = 0;
  for (const e of events) {
    const room = Math.min(DAILY_CAP - s.today - gained, (EVENT_CAP[e] ?? Infinity) - (s.todayByEvent[e] ?? 0));
    const pts = Math.max(0, Math.min(BOND_POINTS[e], room));
    if (pts <= 0) continue;
    gained += pts;
    s.todayByEvent[e] = (s.todayByEvent[e] ?? 0) + pts;
  }
  const before = levelFor(s.xp);
  s = { ...s, xp: s.xp + gained, today: s.today + gained, bornAt: s.bornAt ?? (events.includes('entry') || events.includes('one_word') ? at.toISOString() : null) };
  const after = levelFor(s.xp);
  const levelUp = after > before ? after : null;
  const newForm = levelUp && formFor(after).id !== formFor(before).id ? formFor(after) : null;
  const unlocked = levelUp ? ACCESSORIES.filter((a) => a.level > before && a.level <= after) : [];
  return { state: s, gained, levelUp, newForm, unlocked };
}

/** Bond events for a newly saved page. */
export function entryEvents(entry: Pick<Entry, 'kind' | 'text' | 'photos' | 'mood'>, daysSinceLast: number | null, firstPage = false): BondEvent[] {
  const events: BondEvent[] = [entry.kind === 'one_word' ? 'one_word' : 'entry'];
  if (firstPage) events.push('first_page');
  if (entry.kind !== 'one_word' && entry.text.split(/\s+/).filter(Boolean).length >= 80) events.push('deep_entry');
  if (entry.mood) events.push('feeling');
  if (entry.photos.length) events.push('photo');
  if (daysSinceLast !== null && daysSinceLast >= 4) events.push('return');
  return events;
}

export interface BondInfo {
  level: number;
  chapter: Chapter;
  form: Form;
  next: Form | null;
  /** 0..1 towards the next level. */
  progress: number;
  toNext: number;
  maxed: boolean;
}

export function bondInfo(xp: number): BondInfo {
  const level = levelFor(xp);
  const maxed = level >= MAX_LEVEL;
  const lo = xpForLevel(level);
  const hi = xpForLevel(level + 1);
  return {
    level,
    chapter: chapterFor(level),
    form: formFor(level),
    next: FORMS.find((f) => f.level > level) ?? null,
    progress: maxed ? 1 : Math.max(0, Math.min(1, (xp - lo) / (hi - lo))),
    toNext: maxed ? 0 : hi - xp,
    maxed,
  };
}

/** Converts the old water-drop state (v0.3) so nobody loses their mascot's growth. */
export function migrateFromDrops(old: { xp?: number; drops?: number; bornAt?: string | null }): BondState {
  const xp = Math.round(((old.xp ?? 0) + (old.drops ?? 0)) * 9);
  return { ...INITIAL_BOND, xp, bornAt: old.bornAt ?? null, seenLevel: levelFor(xp) };
}

export interface Age {
  days: number;
  label: string;
  years: number;
  birthdayToday: boolean;
}

export function ageOf(bornAt: string | null, now: Date = new Date()): Age | null {
  if (!bornAt) return null;
  const born = new Date(bornAt);
  const start = new Date(born.getFullYear(), born.getMonth(), born.getDate());
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.max(0, Math.round((today.getTime() - start.getTime()) / 86_400_000));
  let years = today.getFullYear() - start.getFullYear();
  if (today.getMonth() < start.getMonth() || (today.getMonth() === start.getMonth() && today.getDate() < start.getDate())) years -= 1;
  const months = (today.getFullYear() - start.getFullYear()) * 12 + today.getMonth() - start.getMonth() - (today.getDate() < start.getDate() ? 1 : 0);
  const label = years >= 1 ? `${years} yaşında` : months >= 1 ? `${months} aylık` : days === 0 ? 'bugün doğdu' : `${days} günlük`;
  const birthdayToday = days > 0 && today.getDate() === start.getDate() && (years >= 1 ? today.getMonth() === start.getMonth() : true);
  return { days, label, years: Math.max(0, years), birthdayToday };
}

export type Season = 'winter' | 'spring' | 'summer' | 'autumn';

export function seasonOf(d: Date = new Date()): Season {
  const m = d.getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}

export function isNight(d: Date = new Date()): boolean {
  return d.getHours() < 5 || d.getHours() >= 23;
}
