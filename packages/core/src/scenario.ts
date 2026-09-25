import { classifySeverity } from './safety';
import { wordCount } from './text';
import type { Entry } from './types';

export type ScenarioBlock = 'privacy' | 'sensitive' | 'too_short';

/**
 * "Alternatif senaryo" oyunu is only offered for light, everyday entries.
 * Anything touching loss, separation, regret, health, violence or crisis
 * disables it for that entry. The server repeats this check.
 */
export function scenarioEligibility(entry: Pick<Entry, 'text' | 'privacy'>): { eligible: true } | { eligible: false; reason: ScenarioBlock } {
  if (entry.privacy !== 'ai_full') return { eligible: false, reason: 'privacy' };
  if (classifySeverity(entry.text) === 'serious') return { eligible: false, reason: 'sensitive' };
  if (wordCount(entry.text) < 5) return { eligible: false, reason: 'too_short' };
  return { eligible: true };
}
