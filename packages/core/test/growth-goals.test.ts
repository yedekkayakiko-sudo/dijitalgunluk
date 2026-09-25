import { describe, expect, it } from 'vitest';
import { dailyPrompt } from '../src/daily';
import { goalChain, goalPhase, type Goal } from '../src/goals';
import { ageOf, award, bondInfo, DAILY_CAP, entryEvents, FORMS, INITIAL_BOND, isNight, levelFor, migrateFromDrops, seasonOf, xpForLevel } from '../src/growth';
import { consume, remaining } from '../src/quota';
import { fillName, scrubIdentifiers } from '../src/scrub';

describe('bond', () => {
  it('levels up quickly at first and slowly later', () => {
    expect(levelFor(0)).toBe(1);
    expect(levelFor(xpForLevel(2))).toBe(2);
    expect(xpForLevel(2)).toBeLessThanOrEqual(12 + 15); // the very first page
    expect(xpForLevel(30)).toBeGreaterThan(4000); // months of real writing
    expect(bondInfo(0)).toMatchObject({ level: 1, chapter: { name: 'Yeni tanışıyoruz' }, form: { name: 'Minik' } });
    expect(bondInfo(xpForLevel(30)).maxed).toBe(true);
  });

  it('rewards meaningful moments and caps each day', () => {
    const at = new Date('2026-03-01T21:00:00');
    const first = award(INITIAL_BOND, entryEvents({ kind: 'entry', text: 'kelime '.repeat(90), photos: ['a'], mood: 4 }, null), at);
    expect(first.gained).toBe(12 + 6 + 2 + 2);
    expect(first.state.bornAt).not.toBeNull();
    let s = first.state;
    for (let i = 0; i < 20; i++) s = award(s, ['entry', 'chat', 'breathe'], at).state;
    expect(s.today).toBeLessThanOrEqual(DAILY_CAP);
    const nextDay = award(s, ['entry'], new Date('2026-03-02T09:00:00'));
    expect(nextDay.gained).toBe(12);
    expect(nextDay.state.today).toBe(12);
  });

  it('welcomes people back after quiet days instead of punishing them', () => {
    expect(entryEvents({ kind: 'entry', text: 'döndüm', photos: [], mood: null }, 6)).toContain('return');
    expect(entryEvents({ kind: 'one_word', text: 'yorgun', photos: [], mood: 2 }, 1)).toEqual(['one_word', 'feeling']);
    expect(entryEvents({ kind: 'entry', text: 'ilk', photos: [], mood: null }, null, true)).toEqual(['entry', 'first_page']);
  });

  it('reports level ups, new forms and unlocked accessories', () => {
    const near = { ...INITIAL_BOND, xp: xpForLevel(2) - 1 };
    const r = award(near, ['entry'], new Date('2026-03-01T10:00:00'));
    expect(r.levelUp).toBe(2);
    expect(r.newForm?.name).toBe('Filizli');
    const near3 = { ...INITIAL_BOND, xp: xpForLevel(3) - 1 };
    expect(award(near3, ['entry'], new Date('2026-03-01T10:00:00')).unlocked.map((a) => a.id)).toEqual(['scarf']);
  });

  it('keeps growth from the old water drops', () => {
    const s = migrateFromDrops({ xp: 30, drops: 2, bornAt: '2026-01-01' });
    expect(s.xp).toBe(288);
    expect(levelFor(288)).toBeGreaterThan(3);
    expect(s.bornAt).toBe('2026-01-01');
    expect(s.seenLevel).toBe(levelFor(288));
    expect(FORMS).toHaveLength(10);
  });

  it('ages with the user', () => {
    const born = '2025-09-25T09:00:00';
    expect(ageOf(born, new Date('2025-10-05T12:00:00'))!.label).toBe('10 günlük');
    expect(ageOf(born, new Date('2026-03-01T12:00:00'))!.label).toBe('5 aylık');
    const bday = ageOf(born, new Date('2026-09-25T12:00:00'))!;
    expect(bday).toMatchObject({ label: '1 yaşında', years: 1, birthdayToday: true });
  });
});

describe('goals', () => {
  const g = (over: Partial<Goal>): Goal => ({
    id: 'g', createdAt: '2026-09-01T10:00:00', dueAt: '2026-10-01T20:00:00', text: '5 km koş', why: null,
    status: 'active', reflection: null, reviewedAt: null, parentId: null, ...over,
  });

  it('asks for a check-in about weekly, then asks for a review when due', () => {
    expect(goalPhase(g({}), [], new Date('2026-09-03T10:00:00'))).toBe('sealed');
    expect(goalPhase(g({}), [], new Date('2026-09-09T10:00:00'))).toBe('checkin');
    expect(goalPhase(g({}), [{ goalId: 'g', at: '2026-09-08T10:00:00', feeling: 'ok', note: null }], new Date('2026-09-09T10:00:00'))).toBe('sealed');
    expect(goalPhase(g({}), [], new Date('2026-10-02T10:00:00'))).toBe('due');
    expect(goalPhase(g({ status: 'done' }), [], new Date('2026-10-02T10:00:00'))).toBe('reviewed');
  });

  it('builds the chain oldest first', () => {
    const goals = [g({ id: 'a' }), g({ id: 'b', parentId: 'a' }), g({ id: 'c', parentId: 'b' })];
    expect(goalChain(goals, 'c').map((x) => x.id)).toEqual(['a', 'b', 'c']);
  });
});

describe('scrubIdentifiers', () => {
  it('masks direct identifiers and the user\'s own name', () => {
    const out = scrubIdentifiers('Derya, beni 0532 123 45 67 den ara ya da derya@mail.com. TC: 12345678901, IBAN TR12 0006 1005 1978 6457 8413 26', ['Derya']);
    expect(out).toBe('{AD}, beni [telefon] den ara ya da [e-posta]. TC: [kimlik no], IBAN [IBAN]');
  });
  it('fills the name back in, or drops it gracefully', () => {
    expect(fillName('Sevgili {AD}, bu ay çok yazdın.', 'Derya')).toBe('Sevgili Derya, bu ay çok yazdın.');
    expect(fillName('Sevgili {AD}, bu ay çok yazdın.', null)).toBe('Merhaba, bu ay çok yazdın.');
    expect(fillName('İyi ki yazdın {AD}.', '')).toBe('İyi ki yazdın.');
  });
});

describe('daily prompt and quota', () => {
  it('is stable within a day and can be personal', () => {
    const now = new Date('2026-09-25T09:00:00');
    expect(dailyPrompt({ now })).toBe(dailyPrompt({ now: new Date('2026-09-25T22:00:00') }));
    const prompts = new Set(Array.from({ length: 60 }, (_, i) => dailyPrompt({ now: new Date(2026, 0, i + 1), people: ['Zeynep'] })));
    expect([...prompts].some((p) => p.includes('Zeynep'))).toBe(true);
  });
  it('counts per day and resets the next day', () => {
    const day1 = new Date('2026-09-25T09:00:00');
    let s = null as ReturnType<typeof consume>['state'] | null;
    for (let i = 0; i < 3; i++) s = consume(s, 'scenario', day1).state;
    expect(consume(s, 'scenario', day1).allowed).toBe(false);
    expect(remaining(s, 'scenario', new Date('2026-09-26T09:00:00'))).toBe(3);
  });
});


describe('mascot look', () => {
  it('knows the season and the small hours', () => {
    expect(seasonOf(new Date('2026-01-10'))).toBe('winter');
    expect(seasonOf(new Date('2026-04-10'))).toBe('spring');
    expect(seasonOf(new Date('2026-07-10'))).toBe('summer');
    expect(seasonOf(new Date('2026-10-10'))).toBe('autumn');
    expect(isNight(new Date('2026-10-10T02:30:00'))).toBe(true);
    expect(isNight(new Date('2026-10-10T09:30:00'))).toBe(false);
  });
});
