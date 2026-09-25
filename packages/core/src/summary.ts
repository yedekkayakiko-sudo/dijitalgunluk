import { extractThemes, THEMES } from './emotion';
import type { Entry, MascotTone } from './types';

export interface PeriodStats {
  entryCount: number;
  wordCount: number;
  topPeople: { name: string; count: number }[];
  topThemes: { label: string; count: number }[];
  moodAverage: number | null;
}

/**
 * Stats for the weekly/monthly letter. Only full-analysis entries are counted
 * for people and themes.
 */
export function periodStats(
  entries: Pick<Entry, 'text' | 'mood' | 'privacy'>[],
  peopleByEntry: string[][],
): PeriodStats {
  const people = new Map<string, number>();
  const themes = new Map<string, number>();
  let words = 0, moodSum = 0, moodCount = 0;
  entries.forEach((e, i) => {
    words += e.text.split(/\s+/).filter(Boolean).length;
    if (e.mood != null) { moodSum += e.mood; moodCount++; }
    if (e.privacy !== 'ai_full') return;
    for (const p of new Set(peopleByEntry[i] ?? [])) people.set(p, (people.get(p) ?? 0) + 1);
    for (const t of extractThemes(e.text)) themes.set(t, (themes.get(t) ?? 0) + 1);
  });
  const top = (m: Map<string, number>) => [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3);
  return {
    entryCount: entries.length,
    wordCount: words,
    topPeople: top(people).map(([name, count]) => ({ name, count })),
    topThemes: top(themes).map(([id, count]) => ({ label: THEMES[id].label, count })),
    moodAverage: moodCount ? moodSum / moodCount : null,
  };
}

/** Warm letter written without AI, used offline or when AI is disabled. */
export function templateLetter(stats: PeriodStats, periodLabel: string, tone: MascotTone, name?: string | null): string {
  const hi = name ? `Sevgili ${name},` : 'Merhaba,';
  if (stats.entryCount === 0) {
    return `${hi}\n\n${periodLabel} sayfalar sessizdi. Bu da olur; bazen yaşamak yazmaktan önce gelir. Döndüğünde buradayım.`;
  }
  const lines = [hi, '', `${periodLabel} ${stats.entryCount} sayfa yazdın.`];
  if (stats.topPeople.length) lines.push(`En çok bahsettiğin kişiler: ${stats.topPeople.map((p) => p.name).join(', ')}.`);
  if (stats.topThemes.length) lines.push(`Sık dönen konular: ${stats.topThemes.map((t) => t.label).join(', ')}.`);
  if (tone === 'minimal') return lines.join('\n');
  lines.push('', tone === 'energetic'
    ? 'Her sayfa, geleceğin sana bıraktığı küçük bir iz. Devam!'
    : 'Yazdığın her satır, ileride dönüp bakabileceğin bir iz bırakıyor. Kendine ayırdığın bu zaman için teşekkürler.');
  return lines.join('\n');
}
