import { classifyTopic } from './safety';
import { wordCount } from './text';
import type { Entry } from './types';

export type ScenarioMode = 'light' | 'heartache';
export type ScenarioBlock = 'privacy' | 'sensitive' | 'too_short';

/**
 * "Alternatif senaryo" oyunu.
 *  - light: everyday choices ("kahve yerine çay"), played for fun.
 *  - heartache: breakups, regrets, lost chances. Played carefully: the other
 *    road is shown honestly (with its own costs), nobody is blamed, and it
 *    always ends on what is still in the user's hands: there is always a way forward.
 *  - never for grief, violence or abuse, serious illness, accidents or crisis,
 *    where "what if" thinking feeds self-blame. The server repeats this check.
 */
export function scenarioEligibility(
  entry: Pick<Entry, 'text' | 'privacy'>,
): { eligible: true; mode: ScenarioMode } | { eligible: false; reason: ScenarioBlock } {
  if (entry.privacy !== 'ai_full') return { eligible: false, reason: 'privacy' };
  const topic = classifyTopic(entry.text);
  if (topic === 'blocked') return { eligible: false, reason: 'sensitive' };
  if (wordCount(entry.text) < 5) return { eligible: false, reason: 'too_short' };
  return { eligible: true, mode: topic };
}
