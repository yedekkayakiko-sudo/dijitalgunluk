import type { Entry } from './types';

/*
 * The mascot is a little plant creature that grows as the user writes and
 * ages alongside them. Writing earns water drops ("damla"); the user feeds
 * them to the mascot, which turns them into growth. It never wilts, shrinks or
 * gets sad when the user is away; at most it naps until they return.
 */

export interface Stage {
  id: 'tohum' | 'filiz' | 'fidan' | 'tomurcuk' | 'cicek' | 'agaccik' | 'bilge';
  name: string;
  minXp: number;
  line: string;
}

export const STAGES: Stage[] = [
  { id: 'tohum', name: 'Tohum', minXp: 0, line: 'Minicik bir tohumum. Her sayfan bana su gibi!' },
  { id: 'filiz', name: 'Filiz', minXp: 5, line: 'İlk yapraklarım çıktı! Seni tanıdıkça büyüyorum.' },
  { id: 'fidan', name: 'Fidan', minXp: 20, line: 'Artık bir fidanım. Köklerim senin anılarında.' },
  { id: 'tomurcuk', name: 'Tomurcuk', minXp: 50, line: 'Başımda bir tomurcuk var, bir şeyler açmak üzere…' },
  { id: 'cicek', name: 'Çiçek', minXp: 100, line: 'Çiçek açtım! Bu senin yazdıklarının eseri.' },
  { id: 'agaccik', name: 'Ağaççık', minXp: 200, line: 'Dallarım uzuyor. Birlikte ne çok şey biriktirdik.' },
  { id: 'bilge', name: 'Bilge Ağaç', minXp: 400, line: 'Artık bilge bir ağacım. Gölgemde her anın saklı.' },
];

export interface GrowthInfo {
  index: number;
  stage: Stage;
  next: Stage | null;
  /** 0..1 towards the next stage */
  progress: number;
}

export function growthFor(xp: number): GrowthInfo {
  let index = 0;
  for (let i = 0; i < STAGES.length; i++) if (xp >= STAGES[i].minXp) index = i;
  const stage = STAGES[index];
  const next = STAGES[index + 1] ?? null;
  const progress = next ? (xp - stage.minXp) / (next.minXp - stage.minXp) : 1;
  return { index, stage, next, progress: Math.max(0, Math.min(1, progress)) };
}

/** Drops earned for a newly saved page. Rewards showing up, not word counts. */
export function dropsForEntry(entry: Pick<Entry, 'kind' | 'text' | 'photos'>): number {
  if (entry.kind === 'one_word') return 1;
  const words = entry.text.split(/\s+/).filter(Boolean).length;
  return 1 + (words >= 60 ? 1 : 0) + (entry.photos.length > 0 ? 1 : 0);
}

export interface PetState {
  /** Total drops fed: the growth measure. */
  xp: number;
  /** Earned but not yet fed. */
  drops: number;
  /** ISO date of the very first page: the mascot's birthday. */
  bornAt: string | null;
  lastFedAt: string | null;
}

export const INITIAL_PET: PetState = { xp: 0, drops: 0, bornAt: null, lastFedAt: null };

export function earn(state: PetState, amount: number, at: string): PetState {
  return { ...state, drops: state.drops + amount, bornAt: state.bornAt ?? at };
}

/** Feeds one drop at a time (each tap is a little moment). Returns whether the stage changed. */
export function feed(state: PetState, at: string): { state: PetState; grew: boolean } {
  if (state.drops <= 0) return { state, grew: false };
  const before = growthFor(state.xp).index;
  const next = { ...state, drops: state.drops - 1, xp: state.xp + 1, lastFedAt: at };
  return { state: next, grew: growthFor(next.xp).index > before };
}

export interface Age {
  days: number;
  label: string;
  /** Age in whole years, for the "wise" look. */
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

/** Northern-hemisphere seasons, for the mascot's little accessories. */
export function seasonOf(d: Date = new Date()): Season {
  const m = d.getMonth();
  return m <= 1 || m === 11 ? 'winter' : m <= 4 ? 'spring' : m <= 7 ? 'summer' : 'autumn';
}

/** Late night: the mascot wears its sleeping cap. */
export function isNight(d: Date = new Date()): boolean {
  return d.getHours() < 5;
}
