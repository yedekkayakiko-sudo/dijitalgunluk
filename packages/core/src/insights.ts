import { detectCrisis } from './safety';
import { extractThemes, THEMES } from './emotion';
import type { Entity, Entry } from './types';

/*
 * "Seni tanıdıkça": observations the mascot unlocks as the user writes. This
 * is the real reward of the game: not points, but learning something true
 * about yourself. Everything is computed on the device from moods, times and
 * the people and themes on analysable pages. No labels, no judgement; only
 * patterns, said the way a friend would.
 */

export interface Insight {
  id: string;
  title: string;
  /** Pages needed before this card opens. */
  unlockAt: number;
  unlocked: boolean;
  /** Empty while locked, or when there is not enough signal yet. */
  text: string;
  glyph: string;
}

type E = Pick<Entry, 'id' | 'text' | 'createdAt' | 'mood' | 'privacy' | 'kind'>;

const DAYS = ['pazar', 'pazartesi', 'salı', 'çarşamba', 'perşembe', 'cuma', 'cumartesi'];

function avg(xs: number[]): number {
  return xs.reduce((a, b) => a + b, 0) / Math.max(xs.length, 1);
}

function timeOfDay(h: number): string {
  return h < 5 ? 'gece yarısından sonra' : h < 12 ? 'sabahları' : h < 17 ? 'öğleden sonraları' : h < 22 ? 'akşamları' : 'geceleri';
}

export function insightsFor(entries: E[], people: Pick<Entity, 'name' | 'mentionCount' | 'moodSum' | 'moodCount'>[]): Insight[] {
  const n = entries.length;
  const moodEntries = entries.filter((e) => e.mood !== null && detectCrisis(e.text).level === 'none');
  const overall = avg(moodEntries.map((e) => e.mood!));
  const readable = entries.filter((e) => e.privacy === 'ai_full' && e.kind === 'entry');

  const cards: Omit<Insight, 'unlocked'>[] = [];

  // 1. When you write.
  {
    const buckets = new Map<string, number>();
    for (const e of entries) {
      const k = timeOfDay(new Date(e.createdAt).getHours());
      buckets.set(k, (buckets.get(k) ?? 0) + 1);
    }
    const [top, count] = [...buckets.entries()].sort((a, b) => b[1] - a[1])[0] ?? ['', 0];
    cards.push({
      id: 'rhythm', title: 'Yazma saatin', glyph: '🕰️', unlockAt: 3,
      text: count >= 2 ? `Sayfalarının çoğunu ${top} yazıyorsun. Günün o saatinde kendine ayırdığın bir köşe var demek.` : '',
    });
  }

  // 2. What you write about most.
  {
    const counts = new Map<string, number>();
    for (const e of readable) for (const t of extractThemes(e.text)) counts.set(t, (counts.get(t) ?? 0) + 1);
    const top = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).filter(([, c]) => c >= 2);
    cards.push({
      id: 'topics', title: 'Aklını en çok meşgul eden', glyph: '🧭', unlockAt: 5,
      text: top.length === 2
        ? `En çok ${THEMES[top[0][0]].label} ve ${THEMES[top[1][0]].label} hakkında yazıyorsun. Hayatının şu sıralar ağırlık merkezi burası gibi.`
        : top.length === 1 ? `En çok ${THEMES[top[0][0]].label} hakkında yazıyorsun.` : '',
    });
  }

  // 3. The person around whom your days are brighter.
  {
    const candidates = people.filter((p) => p.moodCount >= 2).map((p) => ({ name: p.name, m: p.moodSum / p.moodCount, c: p.moodCount }));
    const best = candidates.sort((a, b) => b.m - a.m || b.c - a.c)[0];
    cards.push({
      id: 'bright_person', title: 'Günlerini aydınlatan', glyph: '🫶', unlockAt: 8,
      text: best && best.m > overall + 0.3
        ? `${best.name} geçen günlerde ruh hâlin ortalamanın belirgin şekilde üstünde. Ona bunu hiç söyledin mi?`
        : '',
    });
  }

  // 4. What gives energy, what drains it.
  {
    const byTheme = new Map<string, number[]>();
    for (const e of readable) if (e.mood) for (const t of extractThemes(e.text)) byTheme.set(t, [...(byTheme.get(t) ?? []), e.mood]);
    const ranked = [...byTheme.entries()].filter(([, ms]) => ms.length >= 2).map(([t, ms]) => ({ t, m: avg(ms) })).sort((a, b) => b.m - a.m);
    const up = ranked[0];
    const down = ranked[ranked.length - 1];
    cards.push({
      id: 'energy', title: 'İyi gelen, yoran', glyph: '🔋', unlockAt: 12,
      text: up && down && up.t !== down.t && up.m - down.m >= 0.8
        ? `${cap(THEMES[up.t].label)} konusunda yazdığın günler daha aydınlık; ${THEMES[down.t].label} geçen günler daha ağır. Bu dengeyi bilmek, haftanı kurarken işine yarayabilir.`
        : '',
    });
  }

  // 5. Your best day of the week.
  {
    const byDay = new Map<number, number[]>();
    for (const e of moodEntries) byDay.set(new Date(e.createdAt).getDay(), [...(byDay.get(new Date(e.createdAt).getDay()) ?? []), e.mood!]);
    const ranked = [...byDay.entries()].filter(([, ms]) => ms.length >= 2).map(([d, ms]) => ({ d, m: avg(ms) })).sort((a, b) => b.m - a.m);
    const best = ranked[0];
    const worst = ranked[ranked.length - 1];
    cards.push({
      id: 'weekday', title: 'Haftanın ritmi', glyph: '📅', unlockAt: 15,
      text: best && worst && best.d !== worst.d && best.m - worst.m >= 0.7
        ? `En iyi günün ${DAYS[best.d]}, en ağır günün ${DAYS[worst.d]}. ${cap(DAYS[worst.d])} için kendine küçük bir şey ayarlasan?`
        : '',
    });
  }

  // 6. How things have been changing.
  {
    const now = Date.now();
    const recent = moodEntries.filter((e) => now - new Date(e.createdAt).getTime() < 14 * 86_400_000).map((e) => e.mood!);
    const before = moodEntries.filter((e) => now - new Date(e.createdAt).getTime() >= 14 * 86_400_000).map((e) => e.mood!);
    const diff = avg(recent) - avg(before);
    cards.push({
      id: 'trend', title: 'Son iki hafta', glyph: '📈', unlockAt: 25,
      text: recent.length >= 3 && before.length >= 5
        ? diff >= 0.4 ? 'Son iki haftan öncesine göre daha aydınlık. Neyi farklı yaptığını bir sayfaya yazsan, ileride işine yarar.'
          : diff <= -0.4 ? 'Son iki hafta öncesine göre daha ağır geçiyor. Bunu fark etmek bile bir adım; konuşmak istersen buradayım.'
            : 'Son iki haftan öncekilerle aşağı yukarı aynı dengede. İstikrar da bir güçtür.'
        : '',
    });
  }

  // 7. Your longest page: a reminder that you had a lot to say.
  {
    const longest = [...readable].sort((a, b) => b.text.length - a.text.length)[0];
    const words = longest ? longest.text.split(/\s+/).length : 0;
    cards.push({
      id: 'deepest', title: 'En uzun sayfan', glyph: '🪶', unlockAt: 40,
      text: longest && words >= 120
        ? `En uzun sayfan ${words} kelime, ${new Date(longest.createdAt).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long' })} tarihli. O gün söyleyecek çok şeyin varmış.`
        : '',
    });
  }

  return cards.map((c) => ({ ...c, unlocked: n >= c.unlockAt && c.text.length > 0 }));
}

function cap(s: string): string {
  return s.charAt(0).toLocaleUpperCase('tr-TR') + s.slice(1);
}
