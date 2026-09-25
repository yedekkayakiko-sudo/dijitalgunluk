import { describe, expect, it } from 'vitest';
import { isOpenable, openDateFor, timeUntil } from '../src/letters';
import { scenarioEligibility } from '../src/scenario';
import { moodSeries, onThisDay, pickMemoryCallback, reminderPlan, rhythmMessage, writingRhythm } from '../src/timeline';

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
    expect(timeUntil(openAt, new Date(now.getTime() + 5_000))).toBe('1 yıl');
    expect(timeUntil(openDateFor(3, now).toISOString(), new Date('2026-09-20T12:00:00'))).toBe('3 ay 5 gün');
    expect(timeUntil(new Date('2026-10-05T09:00:00').toISOString(), now)).toBe('10 gün');
  });
});

describe('scenarioEligibility', () => {
  it('plays light everyday decisions for fun', () => {
    expect(scenarioEligibility({ text: 'Sabah kahve yerine çay içtim ve otobüse bindim.', privacy: 'ai_full' })).toEqual({ eligible: true, mode: 'light' });
  });
  it('plays breakups and regrets in the careful heartache mode', () => {
    expect(scenarioEligibility({ text: 'Bugün sevgilimle ayrıldık, çok pişmanım.', privacy: 'ai_full' })).toEqual({ eligible: true, mode: 'heartache' });
  });
  it('plays a painful day carefully, never for laughs', () => {
    expect(scenarioEligibility({ text: 'Bugün çok kötü geçti. Toplantıda azar yedim, eve gelince ağladım. Kırıldım.', privacy: 'ai_full' })).toEqual({ eligible: true, mode: 'heartache' });
  });
  it('never plays grief, abuse or crisis, nor non-analysable entries', () => {
    expect(scenarioEligibility({ text: 'Dedem geçen hafta vefat etti, keşke daha sık gitseydim.', privacy: 'ai_full' })).toEqual({ eligible: false, reason: 'sensitive' });
    expect(scenarioEligibility({ text: 'Bana şiddet uyguladı, keşke oraya hiç gitmeseydim.', privacy: 'ai_full' })).toEqual({ eligible: false, reason: 'sensitive' });
    expect(scenarioEligibility({ text: 'Ayrıldık ve artık yaşamak istemiyorum.', privacy: 'ai_full' })).toEqual({ eligible: false, reason: 'sensitive' });
    expect(scenarioEligibility({ text: 'Sabah kahve yerine çay içtim ve otobüse bindim.', privacy: 'ai_read' })).toEqual({ eligible: false, reason: 'privacy' });
  });
});


describe('reminderPlan', () => {
  it('reminds daily for a week, then only twice during a long absence', () => {
    const slots = reminderPlan('21:00', new Date('2026-09-25T12:00:00'));
    expect(slots.filter((s) => s.kind === 'daily')).toHaveLength(7);
    expect(slots.filter((s) => s.kind === 'missed').map((s) => s.at.getDate())).toEqual([5, 16]);
    expect(reminderPlan(null)).toEqual([]);
  });
  it('skips today when the time has passed', () => {
    const slots = reminderPlan('09:00', new Date('2026-09-25T12:00:00'));
    expect(slots[0].at.getDate()).toBe(26);
  });
});

describe('pickMemoryCallback', () => {
  const now = new Date('2026-09-25T12:00:00');
  it('brings back a warm page from about a month or a year ago', () => {
    const pick = pickMemoryCallback(
      [
        { createdAt: '2026-08-26T20:00:00', text: 'Zeynep ile sahilde yürüdük, uzun uzun konuştuk ve çok güldük. Sonra dondurma yedik.', mood: 5, kind: 'entry' as const },
        { createdAt: '2025-09-24T20:00:00', text: 'Yeni işe başladım, heyecanlıyım ama biraz da korkuyorum doğrusu.', mood: 4, kind: 'entry' as const },
      ],
      now,
    )!;
    expect(pick.label).toBe('1 yıl önce');
    expect(pick.snippet).toContain('Yeni işe başladım');
  });
  it('skips hard days and very short pages', () => {
    expect(pickMemoryCallback([{ createdAt: '2026-08-26T20:00:00', text: 'Çok kötü bir gündü, hiçbir şey yolunda gitmedi, eve gelip ağladım.', mood: 1, kind: 'entry' as const }], now)).toBeNull();
    expect(pickMemoryCallback([{ createdAt: '2026-08-26T20:00:00', text: 'iyi', mood: 5, kind: 'entry' as const }], now)).toBeNull();
  });
});
