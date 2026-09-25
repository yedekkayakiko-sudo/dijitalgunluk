export interface FutureLetter {
  id: string;
  createdAt: string;
  openAt: string;
  body: string;
  openedAt: string | null;
}

export const LETTER_PRESETS = [
  { label: '1 ay sonra', months: 1 },
  { label: '6 ay sonra', months: 6 },
  { label: '1 yıl sonra', months: 12 },
  { label: '5 yıl sonra', months: 60 },
] as const;

export function openDateFor(months: number, from: Date = new Date()): Date {
  const d = new Date(from);
  d.setMonth(d.getMonth() + months);
  return d;
}

export function isOpenable(letter: Pick<FutureLetter, 'openAt'>, now: Date = new Date()): boolean {
  return new Date(letter.openAt).getTime() <= now.getTime();
}

/** "3 ay 12 gün" style countdown in Turkish, counted in whole calendar days. */
export function timeUntil(openAt: string, now: Date = new Date()): string {
  const target = new Date(openAt);
  if (target.getTime() <= now.getTime()) return 'açılmaya hazır';
  const from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const to = new Date(target.getFullYear(), target.getMonth(), target.getDate());
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (openDateFor(months, from) > to) months -= 1;
  const days = Math.round((to.getTime() - openDateFor(months, from).getTime()) / 86_400_000);
  if (months === 0) return days <= 1 ? 'yarın' : `${days} gün`;
  const years = Math.floor(months / 12);
  const rest = months % 12;
  const parts = [years && `${years} yıl`, rest && `${rest} ay`, !years && days && `${days} gün`].filter(Boolean);
  return parts.join(' ');
}
