/*
 * Goal chains: "1 ay sonraki hedefim bu". A goal is sealed until its date,
 * gets gentle check-ins along the way, is reviewed without judgement, and the
 * next goal links to it so progress becomes a visible path.
 */

export type GoalStatus = 'active' | 'done' | 'partial' | 'missed';

export interface Goal {
  id: string;
  createdAt: string;
  dueAt: string;
  text: string;
  why: string | null;
  status: GoalStatus;
  reflection: string | null;
  reviewedAt: string | null;
  parentId: string | null;
}

export interface GoalCheckin {
  goalId: string;
  at: string;
  feeling: 'good' | 'ok' | 'hard';
  note: string | null;
}

export const GOAL_PRESETS = [
  { label: '1 hafta', days: 7 },
  { label: '2 hafta', days: 14 },
  { label: '1 ay', days: 30 },
  { label: '3 ay', days: 90 },
] as const;

export const REVIEW_OPTIONS: { status: Exclude<GoalStatus, 'active'>; label: string; reply: string }[] = [
  { status: 'done', label: 'Başardım', reply: 'Başardın! Bunu kendine söylemeyi unutma: dediğini yaptın.' },
  { status: 'partial', label: 'Kısmen', reply: 'Yolun bir kısmını yürüdün; bu da bir adım. Neyin işe yaradığını biliyorsun artık.' },
  { status: 'missed', label: 'Bu sefer olmadı', reply: 'Olmaması başarısızlık değil, bilgi. Bu hedef sana ne öğretti?' },
];

export type GoalPhase = 'sealed' | 'checkin' | 'due' | 'reviewed';

const DAY = 86_400_000;

export function goalPhase(goal: Goal, checkins: GoalCheckin[], now: Date = new Date()): GoalPhase {
  if (goal.status !== 'active') return 'reviewed';
  const t = now.getTime();
  const due = new Date(goal.dueAt).getTime();
  if (t >= due) return 'due';
  const created = new Date(goal.createdAt).getTime();
  const span = due - created;
  const last = Math.max(created, ...checkins.filter((c) => c.goalId === goal.id).map((c) => new Date(c.at).getTime()));
  // Check in about weekly, or once halfway for short goals.
  const interval = Math.min(7 * DAY, span / 2);
  return t - last >= interval && due - t > DAY ? 'checkin' : 'sealed';
}

/** Oldest-first chain ending with `id`. */
export function goalChain(goals: Goal[], id: string): Goal[] {
  const byId = new Map(goals.map((g) => [g.id, g]));
  const chain: Goal[] = [];
  let cur = byId.get(id);
  const seen = new Set<string>();
  while (cur && !seen.has(cur.id)) {
    seen.add(cur.id);
    chain.unshift(cur);
    cur = cur.parentId ? byId.get(cur.parentId) : undefined;
  }
  return chain;
}

export function dueDateFor(days: number, from: Date = new Date()): Date {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate() + days, 20, 0, 0);
  return d;
}
