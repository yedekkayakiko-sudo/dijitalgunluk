import { describe, expect, it } from 'vitest';
import { dailyPrompt } from '../src/daily';
import { goalChain, goalPhase, type Goal } from '../src/goals';
import { ageOf, dropsForEntry, earn, feed, growthFor, INITIAL_PET } from '../src/growth';
import { consume, remaining } from '../src/quota';
import { fillName, scrubIdentifiers } from '../src/scrub';

describe('growth', () => {
  it('moves through stages as drops are fed', () => {
    expect(growthFor(0).stage.id).toBe('tohum');
    expect(growthFor(5).stage.id).toBe('filiz');
    expect(growthFor(450).stage.id).toBe('bilge');
    expect(growthFor(450).next).toBeNull();
    expect(growthFor(10).progress).toBeCloseTo(5 / 15);
  });

  it('rewards showing up, a bit more for long pages and photos', () => {
    expect(dropsForEntry({ kind: 'one_word', text: 'huzurlu', photos: [] })).toBe(1);
    expect(dropsForEntry({ kind: 'entry', text: 'kısa', photos: ['a.jpg'] })).toBe(2);
    expect(dropsForEntry({ kind: 'entry', text: 'kelime '.repeat(80), photos: ['a.jpg'] })).toBe(3);
  });

  it('feeds one drop at a time and reports growing a stage', () => {
    let s = earn(INITIAL_PET, 5, '2026-01-01T10:00:00');
    expect(s.bornAt).toBe('2026-01-01T10:00:00');
    let grew = false;
    for (let i = 0; i < 5; i++) ({ state: s, grew } = feed(s, '2026-01-02T10:00:00'));
    expect(grew).toBe(true);
    expect(s).toMatchObject({ xp: 5, drops: 0 });
    expect(feed(s, 'x').state).toBe(s); // nothing to feed
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
