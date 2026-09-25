import { describe, expect, it } from 'vitest';
import { isOpenable, openDateFor, timeUntil } from '../src/letters';
import { scenarioEligibility } from '../src/scenario';
import { moodSeries, onThisDay, rhythmMessage, writingRhythm } from '../src/timeline';

const now = new Date('2026-09-25T12:00:00');

describe('onThisDay', () => {
  it('groups entries from the same date in past years', () => {
    const groups = onThisDay(
      [{ createdAt: '2025-09-25T09:00:00' }, { createdAt: '2023-09-25T22:00:00' }, { createdAt: '2025-09-24T09:00:00' }, { createdAt: '2026-09-25T08:00:00' }],
      now,
    );
    expect(groups.map((g) => g.yearsAgo)).toEqual([1, 3]);
  });
});

describe('writingRhythm', () => {
  it('counts a run ending yesterday', () => {
    const r = writingRhythm(['2026-09-24T10:00:00', '2026-09-23T10:00:00', '2026-09-22T10:00:00'], now);
    expect(r).toMatchObject({ wroteToday: false, currentRun: 3, daysSinceLast: 1 });
  });
  it('frames gaps gently', () => {
    const msg = rhythmMessage(writingRhythm(['2026-09-20T10:00:00'], now));
    expect(msg).toContain('Boşluklar');
    expect(msg).not.toMatch(/kaybett|kırıldı|sıfırlandı/);
  });
});

describe('moodSeries', () => {
  it('averages by day and skips entries without mood', () => {
    const s = moodSeries([
      { createdAt: '2026-09-24T10:00:00', mood: 2 },
      { createdAt: '2026-09-24T20:00:00', mood: 4 },
      { createdAt: '2026-09-25T10:00:00', mood: null },
    ]);
    expect(s).toEqual([{ key: '2026-09-24', average: 3, count: 2 }]);
  });
});

describe('future letters', () => {
  it('locks until the open date', () => {
    const openAt = openDateFor(12, now).toISOString();
    expect(isOpenable({ openAt }, now)).toBe(false);
    expect(isOpenable({ openAt }, new Date('2027-09-26'))).toBe(true);
    expect(timeUntil(openAt, now)).toBe('1 yıl');
  });
});

describe('scenarioEligibility', () => {
  it('allows light everyday decisions', () => {
    expect(scenarioEligibility({ text: 'Sabah kahve yerine çay içtim ve otobüse bindim.', privacy: 'ai_full' })).toEqual({ eligible: true });
  });
  it('blocks sensitive entries and non-analysable privacy levels', () => {
    expect(scenarioEligibility({ text: 'Bugün sevgilimle ayrıldık, çok pişmanım.', privacy: 'ai_full' })).toEqual({ eligible: false, reason: 'sensitive' });
    expect(scenarioEligibility({ text: 'Sabah kahve yerine çay içtim ve otobüse bindim.', privacy: 'ai_read' })).toEqual({ eligible: false, reason: 'privacy' });
  });
});
